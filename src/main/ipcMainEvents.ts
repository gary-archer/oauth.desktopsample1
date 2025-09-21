import {BrowserWindow, ipcMain, IpcMainInvokeEvent} from 'electron';
import {ApiUserInfo} from '../shared/api/apiUserInfo';
import {Company} from '../shared/api/company';
import {CompanyTransactions} from '../shared/api/companyTransactions';
import {OAuthUserInfo} from '../shared/api/oauthUserInfo';
import {ErrorFactory} from '../shared/errors/errorFactory';
import {IpcEventNames} from '../shared/ipcEventNames';
import {ApiService} from './api/apiService';
import {Configuration} from './configuration/configuration';
import {OAuthService} from './oauth/oauthService';
import {OAuthServiceImpl} from './oauth/oauthServiceImpl';
import {HttpProxy} from './utilities/httpProxy';

/*
 * A class that deals with IPC events of the main side of the app
 */
export class IpcMainEvents {

    private readonly configuration: Configuration;
    private readonly httpProxy: HttpProxy;
    private readonly oauthService: OAuthService;
    private readonly apiService: ApiService;
    private window: BrowserWindow | null;

    public constructor(configuration: Configuration) {
        this.configuration = configuration;
        this.httpProxy = new HttpProxy(this.configuration.app.useProxy, this.configuration.app.proxyUrl);
        this.window = null;
        this.oauthService = new OAuthServiceImpl(this.configuration.oauth, this.httpProxy);
        this.apiService = new ApiService(this.configuration, this.oauthService, this.httpProxy);
        this.setupCallbacks();
    }

    /*
     * Store the window, load tokens and register to receive IPC messages from the renderer process
     */
    public register(window: BrowserWindow): void {

        this.window = window;

        ipcMain.handle(IpcEventNames.ON_GET_COMPANIES, this.onGetCompanyList);
        ipcMain.handle(IpcEventNames.ON_GET_TRANSACTIONS, this.onGetCompanyTransactions);
        ipcMain.handle(IpcEventNames.ON_GET_OAUTH_USER_INFO, this.onGetOAuthUserInfo);
        ipcMain.handle(IpcEventNames.ON_GET_API_USER_INFO, this.onGetApiUserInfo);
        ipcMain.handle(IpcEventNames.ON_IS_LOGGED_IN, this.onIsLoggedIn);
        ipcMain.handle(IpcEventNames.ON_LOGIN, this.onLogin);
        ipcMain.handle(IpcEventNames.ON_LOGIN_REACTIVATE, this.onLoginReactivate);
        ipcMain.handle(IpcEventNames.ON_LOGOUT, this.onLogout);
        ipcMain.handle(IpcEventNames.ON_TOKEN_REFRESH, this.onTokenRefresh);
        ipcMain.handle(IpcEventNames.ON_EXPIRE_ACCESS_TOKEN, this.onExpireAccessToken);
        ipcMain.handle(IpcEventNames.ON_EXPIRE_REFRESH_TOKEN, this.onExpireRefreshToken);
    }

    /*
     * Make an API request to get companies
     */
    private async onGetCompanyList(event: IpcMainInvokeEvent): Promise<Company[]> {

        return this.handleAsyncOperation(
            event,
            () => this.apiService.getCompanyList());
    }

    /*
     * Make an API request to get transactions
     */
    private async onGetCompanyTransactions(event: IpcMainInvokeEvent, args: any): Promise<CompanyTransactions> {

        return this.handleAsyncOperation(
            event,
            () => this.apiService.getCompanyTransactions(args.id));
    }

    /*
     * Make an API request to get OAuth user info
     */
    private async onGetOAuthUserInfo(event: IpcMainInvokeEvent): Promise<OAuthUserInfo> {

        return this.handleAsyncOperation(
            event,
            () => this.apiService.getOAuthUserInfo());
    }

    /*
     * Make an API request to get API user info
     */
    private async onGetApiUserInfo(event: IpcMainInvokeEvent): Promise<ApiUserInfo> {

        return this.handleAsyncOperation(
            event,
            () => this.apiService.getApiUserInfo());
    }

    /*
     * See if there are any tokens
     */
    private async onIsLoggedIn(event: IpcMainInvokeEvent): Promise<boolean> {

        return this.handleNonAsyncOperation(
            event,
            () => this.oauthService.isLoggedIn());
    }

    /*
     * Run a login redirect on the system browser
     */
    private async onLogin(event: IpcMainInvokeEvent): Promise<void> {

        return this.handleAsyncOperation(
            event,
            () => this.oauthService.login());
    }

    /*
     * Bring the window back to the foreground when a login completes
     */
    private async onLoginReactivate(event: IpcMainInvokeEvent): Promise<void> {

        return this.handleNonAsyncOperation(
            event,
            () => this.window?.show());
    }

    /*
     * Run a logout redirect on the system browser
     */
    private async onLogout(event: IpcMainInvokeEvent): Promise<void> {

        return this.handleNonAsyncOperation(
            event,
            () => this.oauthService.logout());
    }

    /*
     * Perform token refresh
     */
    private async onTokenRefresh(event: IpcMainInvokeEvent): Promise<void> {

        return this.handleAsyncOperation(
            event,
            () => this.oauthService.refreshAccessToken());
    }

    /*
     * Clear login state after certain errors
     */
    private async onClearLoginState(event: IpcMainInvokeEvent): Promise<void> {

        return this.handleNonAsyncOperation(
            event,
            () => this.oauthService.clearLoginState());
    }

    /*
     * For testing, make the access token act expired
     */
    private async onExpireAccessToken(event: IpcMainInvokeEvent): Promise<void> {

        return this.handleNonAsyncOperation(
            event,
            () => this.oauthService.expireAccessToken());
    }

    /*
     * For testing, make the refresh token act expired
     */
    private async onExpireRefreshToken(event: IpcMainInvokeEvent): Promise<void> {

        return this.handleNonAsyncOperation(
            event,
            () => this.oauthService.expireRefreshToken());
    }

    /*
     * Run an async operation and return data and error values so that the frontend gets error objects
     * Also make common security checks to ensure that the sender is the application
     */
    private async handleAsyncOperation(
        event: IpcMainInvokeEvent,
        action: () => Promise<any>): Promise<any> {

        try {

            if (!event.senderFrame?.url.startsWith('file:/')) {
                throw ErrorFactory.fromIpcForbiddenError();
            }

            const data = await action();
            return {
                data,
                error: ''
            };

        } catch (e: any) {

            const error = ErrorFactory.fromException(e);
            return {
                data: null,
                error: error.toJson()
            };
        }
    }

    /*
     * Run a non-async operation and return data and error values so that the frontend gets error objects
     * Also make common security checks to ensure that the sender is the application
     */
    private async handleNonAsyncOperation(
        event: IpcMainInvokeEvent,
        action: () => any): Promise<any> {

        try {
            if (!event.senderFrame?.url.startsWith('file:/')) {
                throw ErrorFactory.fromIpcForbiddenError();
            }

            const data = action();
            return {
                data,
                error: ''
            };

        } catch (e: any) {

            const error = ErrorFactory.fromException(e);
            return {
                data: null,
                error: error.toJson()
            };
        }
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private setupCallbacks() {

        this.onGetCompanyList = this.onGetCompanyList.bind(this);
        this.onGetCompanyTransactions = this.onGetCompanyTransactions.bind(this);
        this.onGetOAuthUserInfo = this.onGetOAuthUserInfo.bind(this);
        this.onGetApiUserInfo = this.onGetApiUserInfo.bind(this);
        this.onIsLoggedIn = this.onIsLoggedIn.bind(this);
        this.onLogin = this.onLogin.bind(this);
        this.onLoginReactivate = this.onLoginReactivate.bind(this);
        this.onLogout = this.onLogout.bind(this);
        this.onTokenRefresh = this.onTokenRefresh.bind(this);
        this.onExpireAccessToken = this.onExpireAccessToken.bind(this);
        this.onExpireRefreshToken = this.onExpireRefreshToken.bind(this);
    }
}
