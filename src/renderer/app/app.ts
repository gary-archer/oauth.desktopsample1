import {ApiClient} from '../api/apiClient';
import {IpcRendererEvents} from '../ipcRendererEvents';
import {OAuthClient} from '../oauth/oauthClient';
import {OAuthClientImpl} from '../oauth/oauthClientImpl';
import {ErrorView} from '../views/errorView';
import {HeaderButtonsView} from '../views/headerButtonsView';
import {LoginNavigation} from '../views/loginNavigation';
import {Router} from '../views/router';
import {TitleView} from '../views/titleView';

/*
 * The Electron render process starts with the application class
 */
export class App {

    private ipcEvents!: IpcRendererEvents;
    private oauthClient!: OAuthClient;
    private apiClient!: ApiClient;
    private router!: Router;
    private titleView!: TitleView;
    private headerButtonsView!: HeaderButtonsView;
    private errorView!: ErrorView;
    private isInitialised: boolean;

    public constructor() {

        this.isInitialised = false;
        this.setupCallbacks();
    }

    /*
     * Run the startup logic for the renderer process
     */
    public async execute(): Promise<void> {

        // Start listening for hash changes
        window.onhashchange = this.onHashChange;

        try {

            // Do the initial render before getting data
            this.initialRender();

            // Do one time app initialisation
            await this.initialiseApp();

            // Attempt to load data from the API, which may trigger a login redirect
            await this.loadMainView();

            // Get user info from the API unless we are in the login required view
            if (!this.router.isInLoginRequiredView()) {
                await this.loadUserInfo();
            }

        } catch (e: any) {

            // Render the error view if there are problems
            this.errorView.report(e);
        }
    }

    /*
     * Create views and do the initial render
     */
    private initialRender() {

        this.titleView = new TitleView();
        this.titleView.load();

        this.headerButtonsView = new HeaderButtonsView(
            this.onHome,
            this.onReloadData,
            this.onExpireAccessToken,
            this.onExpireRefreshToken,
            this.onLogout);
        this.headerButtonsView.load();

        this.errorView = new ErrorView();
        this.errorView.load();
    }

    /*
     * Initialise the app
     */
    private async initialiseApp(): Promise<void> {

        this.ipcEvents = new IpcRendererEvents(window);

        // Initialise OAuth handling
        this.oauthClient = new OAuthClientImpl(this.ipcEvents);

        // Create a client to reliably call the API
        this.apiClient = new ApiClient(this.ipcEvents, this.oauthClient);

        // Create our simple router class
        this.router = new Router(this.apiClient);

        // Update state to indicate that global objects are loaded
        this.isInitialised = true;
    }

    /*
     * Load API data for the main view and update UI controls
     */
    private async loadMainView(): Promise<void> {

        // Indicate busy
        this.headerButtonsView.disableSessionButtons();

        // Load the view
        await this.router.loadView();

        if (this.router.isInLoginRequiredView()) {

            // If we are logged out then clear user info
            this.headerButtonsView.setIsAuthenticated(false);
            this.titleView.clearUserInfo();

        } else {

            // Otherwise re-enable buttons
            this.headerButtonsView.setIsAuthenticated(true);
            this.headerButtonsView.enableSessionButtons();
        }
    }

    /*
     * Load API data for the user info fragment
     */
    private async loadUserInfo(): Promise<void> {

        if (await this.oauthClient.isLoggedIn()) {
            await this.titleView.loadUserInfo(this.apiClient);
        }
    }

    /*
     * Change the view based on the hash URL
     */
    private async onHashChange(): Promise<void> {

        try {

            // Run main view navigation
            if (this.isInitialised) {
                await this.loadMainView();
            }

        } catch (e: any) {

            // Report failures
            this.errorView.report(e);
        }
    }

    /*
     * The home button moves to the home view but also deals with error recovery
     */
    private async onHome(): Promise<void> {

        try {

            // If we have not initialised, re-initialise the app
            if (!this.isInitialised) {
                await this.initialiseApp();
            }

            if (this.isInitialised) {

                if (this.router.isInLoginRequiredView()) {

                    // We login when home is clicked in the Login Required view
                    await this.login();

                } else {

                    if (this.router.isInHomeView()) {

                        // Force a reload if we are already in the home view
                        await this.loadMainView();

                    } else {

                        // Otherwise move to the home view
                        location.hash = '#';
                    }
                }
            }

        } catch (e: any) {

            // Report any errors
            this.errorView.report(e);
        }
    }

    /*
     * Initiate the login operation
     */
    private async login(): Promise<void> {

        try {

            // Do the work of the login
            this.router.getLoginRequiredView().showProgress();
            await this.oauthClient.login();

            // Move back to the location that took us to login required
            LoginNavigation.restorePreLoginLocation();

        } catch (e: any) {

            // Hide progress and output errors
            this.router.getLoginRequiredView().hideProgress();
            this.errorView.report(e);

        } finally {

            // Send an event to the main side of the app, to return the window to the foreground
            await this.ipcEvents.reactivate();
        }

        try {

            // Then load user info for the logged in user
            await this.loadUserInfo();

        } catch (e: any) {

            // Report user info load errors
            this.errorView.report(e);
        }
    }

    /*
     * Try to reload data when requested via the button click
     */
    private async onReloadData(): Promise<void> {

        try {

            // Reload all views
            await this.loadMainView();
            await this.loadUserInfo();

        } catch (e: any) {

            // Report reload errors
            this.errorView.report(e);
        }
    }

    /*
     * Logout processing
     */
    private async onLogout(): Promise<void> {

        // The basic logout for this sample just removes tokens
        this.oauthClient.logout();

        // Navigate to the logged out view
        location.hash = '#loggedout';
    }

    /*
     * Force a new access token to be retrieved
     */
    private async onExpireAccessToken(): Promise<void> {
        await this.oauthClient.expireAccessToken();
    }

    /*
     * Force the next refresh token request to fail
     */
    private async onExpireRefreshToken(): Promise<void> {
        await this.oauthClient.expireRefreshToken();
    }

    /*
     * Plumbing to ensure that the this parameter is available in async callbacks
     */
    private setupCallbacks(): void {
        this.onHashChange = this.onHashChange.bind(this);
        this.onHome = this.onHome.bind(this);
        this.onReloadData = this.onReloadData.bind(this);
        this.onExpireAccessToken = this.onExpireAccessToken.bind(this);
        this.onExpireRefreshToken = this.onExpireRefreshToken.bind(this);
        this.onLogout = this.onLogout.bind(this);
    }
}
