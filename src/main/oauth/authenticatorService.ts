/*
 * An interface to represent authentication related operations
 */
export interface AuthenticatorService {

    // Indicate if the user is logged in
    isLoggedIn(): boolean;

    // Return the URL to the userinfo endpoint when requested
    getUserInfoEndpoint(): Promise<string | null>;

    // Try to get an access token
    getAccessToken(): Promise<string | null>;

    // Refresh the access token when it expires
    refreshAccessToken(): Promise<string | null>;

    // Do the login redirect and process the response
    login(): Promise<void>;

    // Run the logout logic
    logout(): void;

    // Update the access token to make it act like it is expired
    expireAccessToken(): void;

    // Update the refresh token to make it act like it is expired
    expireRefreshToken(): void;
}
