import {IpcRendererEvents} from '../ipcRendererEvents';
import {OAuthClient} from './oauthClient';

/*
 * The entry point class for OAuth related requests in the renderer process
 */
export class OAuthClientImpl implements OAuthClient {

    private readonly ipcEvents: IpcRendererEvents;

    public constructor(ipcEvents: IpcRendererEvents) {
        this.ipcEvents = ipcEvents;
    }

    /*
     * See if currently logged in
     */
    public async isLoggedIn(): Promise<boolean> {
        return await this.ipcEvents.isLoggedIn();
    }

    /*
     * Forward to the main side of the app to perform the login work
     */
    public async login(): Promise<void> {
        return await this.ipcEvents.login();
    }

    /*
     * Forward to the main side of the app to perform the logout work
     */
    public async logout(): Promise<void> {
        await this.ipcEvents.logout();
    }

    /*
     * Do a token refresh on the main side of the app
     */
    public async refreshAccessToken(): Promise<void> {
        await this.ipcEvents.tokenRefresh();
    }

    /*
     * This method is for testing only, to make the access token fail and act like it has expired
     * The corrupted access token will be sent to the API but rejected when introspected
     */
    public async expireAccessToken(): Promise<void> {
        await this.ipcEvents.expireAccessToken();
    }

    /*
     * This method is for testing only, to make the refresh token fail and act like it has expired
     * The corrupted refresh token will be sent to the authorization server but rejected
     */
    public async expireRefreshToken(): Promise<void> {
        await this.ipcEvents.expireRefreshToken();
    }
}
