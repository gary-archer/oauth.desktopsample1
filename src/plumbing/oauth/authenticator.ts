import {OAuthUserInfo} from './oauthUserInfo';

/*
 * An interface to represent authentication related operations
 */
export interface Authenticator {

    // Try to get an access token
    getAccessToken(): Promise<string>;

    // Refresh the access token when it expires
    refreshAccessToken(): Promise<string>;

    // Do the login redirect and process the response
    login(): Promise<void>;

    // Do the logout redirect and process the response
    logout(): void;

    // Get identity attributes to the UI
    getUserInfo(): Promise<OAuthUserInfo>;

    // Update the access token to make it act like it is expired
    expireAccessToken(): Promise<void>;

    // Update the refresh token to make it act like it is expired
    expireRefreshToken(): Promise<void>;
}
