import $ from 'jquery';
import {ApiClient} from '../api/client/apiClient';
import {Configuration} from '../configuration/configuration';
import {ConfigurationLoader} from '../configuration/configurationLoader';
import {ApplicationEventNames} from '../plumbing/events/applicationEventNames';
import {ApplicationEvents} from '../plumbing/events/applicationEvents';
import {Authenticator} from '../plumbing/oauth/authenticator';
import {AuthenticatorImpl} from '../plumbing/oauth/authenticatorImpl';
import {LoginNavigation} from '../plumbing/oauth/login/loginNavigation';
import {HttpProxy} from '../plumbing/utilities/httpProxy';
import {ErrorView} from '../views/errorView';
import {HeaderButtonsView} from '../views/headerButtonsView';
import {Router} from '../views/router';
import {TitleView} from '../views/titleView';

/*
 * The Electron render process starts with the application class
 */
export class App {

    // Global objects
    private _configuration?: Configuration;
    private _authenticator?: Authenticator;
    private _apiClient?: ApiClient;
    private _router?: Router;
    private _titleView?: TitleView;
    private _headerButtonsView?: HeaderButtonsView;
    private _errorView?: ErrorView;

    // State flags
    private _isInitialised: boolean;
    private _mainViewLoaded: boolean;
    private _userInfoLoaded: boolean;

    /*
     * Initialise state
     */
    public constructor() {

        // Configure the JQuery namespace
        (window as any).$ = $;

        // Initialise state flags
        this._isInitialised = false;
        this._mainViewLoaded = false;
        this._userInfoLoaded = false;
        this._setupCallbacks();
    }

    /*
     * The entry point for the Desktop App
     */
    public async execute(): Promise<void> {

        // Start listening for hash changes
        window.onhashchange = this._onHashChange;

        try {

            // Do the initial render
            this._initialRender();

            // Do one time app initialisation
            await this._initialiseApp();

            // Attempt to load data from the API, which may trigger a login redirect
            await this._loadMainView();
            await this._loadUserInfo();

        } catch (e) {

            // Render the error view if there are problems
            this._errorView?.report(e);
        }
    }

    /*
     * Create views and do rendering before the app has initialised
     */
    private _initialRender() {

        this._titleView = new TitleView();
        this._titleView.load();

        this._headerButtonsView = new HeaderButtonsView(
            this._onHome,
            this._onReloadData,
            this._onExpireAccessToken,
            this._onExpireRefreshToken,
            this._onLogout);
        this._headerButtonsView.load();

        this._errorView = new ErrorView();
        this._errorView.load();
    }

    /*
     * Initialise the app
     */
    private async _initialiseApp(): Promise<void> {

        // Download application configuration
        this._configuration = await ConfigurationLoader.load('desktop.config.json');

        // Set up SSL Trust and HTTP debugging
        HttpProxy.initialize(
            this._configuration.app.useProxy,
            this._configuration.app.proxyHost,
            this._configuration.app.proxyPort);

        // Initialise OAuth handling
        this._authenticator = new AuthenticatorImpl(this._configuration.oauth);

        // Create a client to reliably call the API
        this._apiClient = new ApiClient(this._configuration.app.apiBaseUrl, this._authenticator);

        // Create our simple router class
        this._router = new Router(
            this._apiClient,
            this._authenticator,
            this._errorView!,
            this._postLoginAction);

        // Update state to indicate that global objects are loaded
        this._isInitialised = true;
    }

    /*
     * Load API data for the main view and update UI controls
     */
    private async _loadMainView(): Promise<void> {

        try {

            // Call the API
            this._headerButtonsView!.disableSessionButtons();
            await this._router!.loadView();

            // Enable session buttons if all view have loaded
            if (this._userInfoLoaded) {
                this._headerButtonsView!.enableSessionButtons();
            }

            // Update state
            this._mainViewLoaded = true;

        } catch (e) {

            // Update state and rethrow
            this._mainViewLoaded = false;
            throw e;
        }
    }

    /*
     * Load API data for the user info fragment
     */
    private async _loadUserInfo(): Promise<void> {

        try {

            // Call the API
            this._headerButtonsView!.disableSessionButtons();
            await this._titleView!.loadUserInfo(this._apiClient!);

            // Enable session buttons if all view have loaded
            if (this._mainViewLoaded) {
                this._headerButtonsView!.enableSessionButtons();
            }

            // Update state
            this._userInfoLoaded = true;

        } catch (e) {

            // Update state and rethrow
            this._userInfoLoaded = false;
            throw e;
        }
    }

    /*
     * After logging in we get user info and return to the pre login location
     */
    private async _postLoginAction(): Promise<void> {

        LoginNavigation.restorePreLoginLocation();

        try {
            // Load user info for the logged in user
            await this._loadUserInfo();

        } catch (e) {

            // Report failures
            this._errorView!.report(e);
        }
    }

    /*
     * Change the view based on the hash URL
     */
    private async _onHashChange(): Promise<void> {

        try {

            if (this._isInitialised) {

                if (location.hash.indexOf('loginrequired') !== -1) {

                    // Navigate to the login required view before triggering the login
                    await this._router!.loadView();

                } else {

                    // Otherwise run main view navigation
                    await this._loadMainView();
                }
            }

        } catch (e) {

            // Report failures
            this._errorView!.report(e);
        }
    }

    /*
     * The home button moves to the home view but also deals with error recovery
     */
    private async _onHome(): Promise<void> {

        try {

            // If we have not initialised, re-initialise the app
            if (!this._isInitialised) {
                await this._initialiseApp();
            }

            if (this._isInitialised) {

                // If not logged in then publish an event that the login required view will handle
                if (!this._authenticator!.isLoggedIn()) {
                    ApplicationEvents.publish(ApplicationEventNames.ON_LOGIN, {});
                    return
                }

                // Move to the home view
                location.hash = '#';

                // If there are API errors, clicking home tries to reload views
                if (!this._mainViewLoaded) {
                    await this._loadMainView();
                }
                if (!this._userInfoLoaded) {
                    await this._loadUserInfo();
                }
            }

        } catch (e) {
            this._errorView!.report(e);
        }
    }

    /*
     * Try to reload data when requested via the button click
     */
    private async _onReloadData(): Promise<void> {

        try {
            await this._loadMainView();
            await this._loadUserInfo();

        } catch (e) {

            this._errorView!.report(e);
        }
    }

    /*
     * Logout processing
     */
    private async _onLogout(): Promise<void> {

        // The basic logout for this sample just removes tokens
        this._authenticator!.logout();

        // Update UI state
        this._titleView!.clearUserInfo();
        this._headerButtonsView?.disableSessionButtons();

        // Navigate to the login required view
        location.hash = `#loginrequired`;
    }

    /*
     * Force a new access token to be retrieved
     */
    private async _onExpireAccessToken(): Promise<void> {
        await this._authenticator!.expireAccessToken();
    }

    /*
     * Force the next refresh token request to fail
     */
    private async _onExpireRefreshToken(): Promise<void> {
        await this._authenticator!.expireRefreshToken();
    }

    /*
     * Plumbing to ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks(): void {
        this._onHashChange = this._onHashChange.bind(this);
        this._postLoginAction = this._postLoginAction.bind(this);
        this._onHome = this._onHome.bind(this);
        this._onReloadData = this._onReloadData.bind(this);
        this._onExpireAccessToken = this._onExpireAccessToken.bind(this);
        this._onExpireRefreshToken = this._onExpireRefreshToken.bind(this);
        this._onLogout = this._onLogout.bind(this);
   }
}
