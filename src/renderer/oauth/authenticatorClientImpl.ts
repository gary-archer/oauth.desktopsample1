import {IpcRendererEvents} from '../ipcRendererEvents';
import {AuthenticatorClient} from './authenticatorClient';

/*
 * The entry point class for OAuth related requests in the renderer process
 */
export class AuthenticatorClientImpl implements AuthenticatorClient {

    private readonly _ipcEvents: IpcRendererEvents;

    public constructor(ipcEvents: IpcRendererEvents) {

        this._ipcEvents = ipcEvents;
    }

    /*
     * See if currently logged in
     */
    public async isLoggedIn(): Promise<boolean> {
        return await this._ipcEvents.isLoggedIn();
    }

    /*
     * Forward to the main side of the app to perform the login work
     */
    public async login(): Promise<void> {
        await this._ipcEvents.login();
    }

    /*
     * Forward to the main side of the app to perform the logout work
     */
    public async logout(): Promise<void> {
        await this._ipcEvents.logout();
    }

    /*
     * Do a token refresh on the main side of the app
     */
    public async refreshAccessToken(): Promise<void> {
        await this._ipcEvents.tokenRefresh();
    }

    /*
     * This method is for testing only, to make the access token fail and act like it has expired
     * The corrupted access token will be sent to the API but rejected when introspected
     */
    public async expireAccessToken(): Promise<void> {
        await this._ipcEvents.expireAccessToken();
    }

    /*
     * This method is for testing only, to make the refresh token fail and act like it has expired
     * The corrupted refresh token will be sent to the authorization server but rejected
     */
    public async expireRefreshToken(): Promise<void> {
        await this._ipcEvents.expireRefreshToken();
    }
}
