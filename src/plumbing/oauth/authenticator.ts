import {OAuthUserInfo} from './oauthUserInfo';

/*
 * An interface to represent authentication related operations
 */
export interface Authenticator {

    // Indicate if the user is logged in
    isLoggedIn(): boolean;

    // Try to get an access token
    getAccessToken(): Promise<string | null>;

    // Refresh the access token when it expires
    refreshAccessToken(): Promise<string | null>;

    // Do the login redirect and process the response
    login(): Promise<void>;

    // Run the logout logic
    logout(): void;

    // Get identity attributes to the UI
    getUserInfo(): Promise<OAuthUserInfo>;

    // Update the access token to make it act like it is expired
    expireAccessToken(): Promise<void>;

    // Update the refresh token to make it act like it is expired
    expireRefreshToken(): Promise<void>;
}
