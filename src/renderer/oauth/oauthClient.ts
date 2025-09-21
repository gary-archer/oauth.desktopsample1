/*
 * OAuth related operations initiated by the renderer side of the app
 */
export interface OAuthClient {

    // See if logged in
    isLoggedIn(): Promise<boolean>;

    // Ask the main process to refresh the access token when it expires
    refreshAccessToken(): Promise<void>;

    // Do the login redirect and process the response
    login(): Promise<void>;

    // Run the logout logic
    logout(): Promise<void>;

    // Allow the app to clear its login state after certain errors
    clearLoginState(): Promise<void>;

    // For testing, make the access token act expired
    expireAccessToken(): Promise<void>;

    // For testing, make the refresh token act expired
    expireRefreshToken(): Promise<void>;
}
