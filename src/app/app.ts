import {ipcRenderer} from 'electron';
import {ApiClient} from '../api/client/apiClient';
import {Configuration} from '../configuration/configuration';
import {ConfigurationLoader} from '../configuration/configurationLoader';
import {ApplicationEventNames} from '../plumbing/events/applicationEventNames';
import {Authenticator} from '../plumbing/oauth/authenticator';
import {AuthenticatorImpl} from '../plumbing/oauth/authenticatorImpl';
import {ErrorView} from '../views/errorView';
import {HeaderButtonsView} from '../views/headerButtonsView';
import {LoginNavigation} from '../views/loginNavigation';
import {Router} from '../views/router';
import {TitleView} from '../views/titleView';

/*
 * The Electron render process starts with the application class
 */
export class App {

    private _configuration?: Configuration;
    private _authenticator?: Authenticator;
    private _apiClient?: ApiClient;
    private _router?: Router;
    private _titleView?: TitleView;
    private _headerButtonsView?: HeaderButtonsView;
    private _errorView?: ErrorView;
    private _isInitialised: boolean;

    public constructor() {

        this._isInitialised = false;
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

            // Get user info from the API unless we are in the login required view
            if (!this._router!.isInLoginRequiredView()) {
                await this._loadUserInfo();
            }

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

        // Initialise OAuth handling
        this._authenticator = new AuthenticatorImpl(this._configuration.oauth);

        // Create a client to reliably call the API
        this._apiClient = new ApiClient(this._configuration.app.apiBaseUrl, this._authenticator);

        // Create our simple router class
        this._router = new Router(this._apiClient);

        // Update state to indicate that global objects are loaded
        this._isInitialised = true;
    }

    /*
     * Load API data for the main view and update UI controls
     */
    private async _loadMainView(): Promise<void> {

        // Indicate busy
        this._headerButtonsView!.disableSessionButtons();

        // Load the view
        await this._router!.loadView();

        if (this._router!.isInLoginRequiredView()) {

            // If we are logged out then clear user info
            this._titleView!.clearUserInfo();

        } else {

            // Otherwise re-enable buttons
            this._headerButtonsView!.enableSessionButtons();
        }
    }

    /*
     * Load API data for the user info fragment
     */
    private async _loadUserInfo(): Promise<void> {
        await this._titleView!.loadUserInfo(this._apiClient!);
    }

    /*
     * Change the view based on the hash URL
     */
    private async _onHashChange(): Promise<void> {

        try {

            // Run main view navigation
            if (this._isInitialised) {
                await this._loadMainView();
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

                if (this._router!.isInLoginRequiredView()) {

                    // We login when home is clicked in the Login Required view
                    await this._login();

                } else {

                    if (this._router!.isInHomeView()) {

                        // Force a reload if we are already in the home view
                        await this._loadMainView();

                    } else {

                        // Otherwise move to the home view
                        location.hash = '#';
                    }
                }
            }

        } catch (e) {

            // Report any errors
            this._errorView!.report(e);
        }
    }

    /*
     * Initiate the login operation
     */
    private async _login(): Promise<void> {

        try {

            // Do the work of the login
            this._router!.getLoginRequiredView().showProgress();
            await this._authenticator?.login();

            // Move back to the location that took us to login required
            LoginNavigation.restorePreLoginLocation();

        } catch (e) {

            // Hide progress and output errors
            this._router!.getLoginRequiredView().hideProgress();
            this._errorView!.report(e);

        } finally {

            // Send an event to the main side of the app, to return the window to the foreground
            ipcRenderer.send(ApplicationEventNames.ON_LOGIN_REACTIVATE, {});
        }

        try {

            // Then load user info for the logged in user
            await this._loadUserInfo();

        } catch (e) {

            // Report user info load errors
            this._errorView!.report(e);
        }
    }

    /*
     * Try to reload data when requested via the button click
     */
    private async _onReloadData(): Promise<void> {

        try {

            // Reload all views
            await this._loadMainView();
            await this._loadUserInfo();

        } catch (e) {

            // Report reload errors
            this._errorView!.report(e);
        }
    }

    /*
     * Logout processing
     */
    private async _onLogout(): Promise<void> {

        // The basic logout for this sample just removes tokens
        this._authenticator!.logout();

        // Navigate to the logged out view
        location.hash = '#loggedout';
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
        this._onHome = this._onHome.bind(this);
        this._onReloadData = this._onReloadData.bind(this);
        this._onExpireAccessToken = this._onExpireAccessToken.bind(this);
        this._onExpireRefreshToken = this._onExpireRefreshToken.bind(this);
        this._onLogout = this._onLogout.bind(this);
    }
}
