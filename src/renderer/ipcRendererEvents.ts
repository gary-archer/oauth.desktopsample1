import {UIError} from '../shared/errors/uiError';
import {IpcEventNames} from '../shared/ipcEventNames';

/*
 * A class that deals with IPC events on the renderer side of the app
 */
export class IpcRendererEvents {

    private readonly _api: any;

    public constructor(window: Window) {
        this._api = (window as any).api;
    }

    /*
     * Make an API request to get companies
     */
    public async getCompanyList() : Promise<any> {
        return await this._sendMessage(IpcEventNames.ON_GET_COMPANIES, {});
    }

    /*
     * Make an API request to get company transactions
     */
    public async getCompanyTransactions(id: string) : Promise<any> {
        return await this._sendMessage(IpcEventNames.ON_GET_TRANSACTIONS, {id});
    }

    /*
     * Make an API request to get OAuth user info
     */
    public async getOAuthUserInfo() : Promise<any> {
        return await this._sendMessage(IpcEventNames.ON_GET_OAUTH_USER_INFO, {});
    }

    /*
     * Make an API request to get API user info
     */
    public async getApiUserInfo() : Promise<any> {
        return await this._sendMessage(IpcEventNames.ON_GET_API_USER_INFO, {});
    }

    /*
     * Ask the main side of the app if it is logged in
     */
    public async isLoggedIn() : Promise<any> {
        return await this._sendMessage(IpcEventNames.ON_IS_LOGGED_IN, {});
    }

    /*
     * Run a login on the main side of the app
     */
    public async login(): Promise<void> {
        await this._sendMessage(IpcEventNames.ON_LOGIN, {});
    }

    /*
     * Reactivate the main window after a login
     */
    public async reactivate(): Promise<void> {
        await this._sendMessage(IpcEventNames.ON_LOGIN_REACTIVATE, {});
    }

    /*
     * Run a logout on the main side of the app
     */
    public async logout(): Promise<void> {
        await this._sendMessage(IpcEventNames.ON_LOGOUT, {});
    }

    /*
     * Run a token refresh on the main side of the app
     */
    public async tokenRefresh(): Promise<void> {
        await this._sendMessage(IpcEventNames.ON_TOKEN_REFRESH, {});
    }

    /*
     * For testing, ask the main side to make the access token act expired
     */
    public async expireAccessToken(): Promise<void> {
        await this._sendMessage(IpcEventNames.ON_EXPIRE_ACCESS_TOKEN, {});
    }

    /*
     * For testing, ask the main side to make the refresh token act expired
     */
    public async expireRefreshToken(): Promise<void> {
        await this._sendMessage(IpcEventNames.ON_EXPIRE_REFRESH_TOKEN, {});
    }

    /*
     * Encapsulate making an IPC call and receiving response data
     */
    private async _sendMessage(eventName: string, requestData: any): Promise<any> {

        const [data, error] = await this._api.sendMessage(eventName, requestData);
        if (error) {
            throw UIError.fromJson(error);
        }

        return data;
    }
}
