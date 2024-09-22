import {ApiClient} from '../api/apiClient';
import {IpcRendererEvents} from '../ipcRendererEvents';
import {AuthenticatorClient} from '../oauth/authenticatorClient';
import {AuthenticatorClientImpl} from '../oauth/authenticatorClientImpl';
import {ErrorView} from '../views/errorView';
import {HeaderButtonsView} from '../views/headerButtonsView';
import {LoginNavigation} from '../views/loginNavigation';
import {Router} from '../views/router';
import {TitleView} from '../views/titleView';

/*
 * The Electron render process starts with the application class
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
export class App {

    private _ipcEvents: IpcRendererEvents | null;
    private _authenticatorClient: AuthenticatorClient | null;
    private _apiClient: ApiClient | null;
    private _router: Router | null;
    private _titleView!: TitleView;
    private _headerButtonsView!: HeaderButtonsView;
    private _errorView!: ErrorView;
    private _isInitialised: boolean;

    public constructor() {

        this._isInitialised = false;
        this._ipcEvents = null;
        this._authenticatorClient = null;
        this._apiClient = null;
        this._router = null;
        this._createViews();
        this._setupCallbacks();
    }

    /*
     * Create views and do the initial render
     */
    private _createViews() {

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
     * Run the startup logic for the renderer process
     */
    public async execute(): Promise<void> {

        // Start listening for hash changes
        window.onhashchange = this._onHashChange;

        try {

            // Do one time app initialisation
            await this._initialiseApp();

            // Attempt to load data from the API, which may trigger a login redirect
            await this._loadMainView();

            // Get user info from the API unless we are in the login required view
            if (!this._router?.isInLoginRequiredView()) {
                await this._loadUserInfo();
            }

        } catch (e: any) {

            // Render the error view if there are problems
            this._errorView.report(e);
        }
    }

    /*
     * Initialise the app
     */
    private async _initialiseApp(): Promise<void> {

        this._ipcEvents = new IpcRendererEvents(window);

        // Initialise OAuth handling
        this._authenticatorClient = new AuthenticatorClientImpl(this._ipcEvents);

        // Create a client to reliably call the API
        this._apiClient = new ApiClient(this._ipcEvents, this._authenticatorClient);

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
        this._headerButtonsView.disableSessionButtons();

        // Load the view
        await this._router?.loadView();

        if (this._router?.isInLoginRequiredView()) {

            // If we are logged out then clear user info
            this._headerButtonsView.setIsAuthenticated(false);
            this._titleView.clearUserInfo();

        } else {

            // Otherwise re-enable buttons
            this._headerButtonsView.setIsAuthenticated(true);
            this._headerButtonsView.enableSessionButtons();
        }
    }

    /*
     * Load API data for the user info fragment
     */
    private async _loadUserInfo(): Promise<void> {

        if (await this._authenticatorClient!.isLoggedIn()) {
            await this._titleView.loadUserInfo(this._apiClient!);
        }
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

        } catch (e: any) {

            // Report failures
            this._errorView.report(e);
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

        } catch (e: any) {

            // Report any errors
            this._errorView.report(e);
        }
    }

    /*
     * Initiate the login operation
     */
    private async _login(): Promise<void> {

        try {

            // Do the work of the login
            this._router!.getLoginRequiredView().showProgress();
            await this._authenticatorClient!.login();

            // Move back to the location that took us to login required
            LoginNavigation.restorePreLoginLocation();

        } catch (e: any) {

            // Hide progress and output errors
            this._router!.getLoginRequiredView().hideProgress();
            this._errorView.report(e);

        } finally {

            // Send an event to the main side of the app, to return the window to the foreground
            await this._ipcEvents?.reactivate();
        }

        try {

            // Then load user info for the logged in user
            await this._loadUserInfo();

        } catch (e: any) {

            // Report user info load errors
            this._errorView.report(e);
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

        } catch (e: any) {

            // Report reload errors
            this._errorView.report(e);
        }
    }

    /*
     * Logout processing
     */
    private async _onLogout(): Promise<void> {

        // The basic logout for this sample just removes tokens
        this._authenticatorClient!.logout();

        // Navigate to the logged out view
        location.hash = '#loggedout';
    }

    /*
     * Force a new access token to be retrieved
     */
    private async _onExpireAccessToken(): Promise<void> {
        await this._authenticatorClient!.expireAccessToken();
    }

    /*
     * Force the next refresh token request to fail
     */
    private async _onExpireRefreshToken(): Promise<void> {
        await this._authenticatorClient!.expireRefreshToken();
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
