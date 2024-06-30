import {
    AuthorizationServiceConfiguration,
    BaseTokenRequestHandler,
    GRANT_TYPE_AUTHORIZATION_CODE,
    GRANT_TYPE_REFRESH_TOKEN,
    StringMap,
    TokenRequest} from '@openid/appauth';
import {OAuthConfiguration} from '../../configuration/oauthConfiguration';
import {ErrorCodes} from '../errors/errorCodes';
import {ErrorFactory} from '../errors/errorFactory';
import {Authenticator} from './authenticator';
import {LoginAsyncAdapter} from './login/loginAsyncAdapter';
import {LoginRedirectResult} from './login/loginRedirectResult';
import {LoginState} from './login/loginState';
import {TokenData} from './tokenData';
import {CustomRequestor} from './utilities/customRequestor';
import {LoopbackWebServer} from './utilities/loopbackWebServer';

/*
 * The entry point class for login and token requests
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
export class AuthenticatorImpl implements Authenticator {

    private readonly _configuration: OAuthConfiguration;
    private _tokens: TokenData | null;
    private _metadata: AuthorizationServiceConfiguration | null;
    private readonly _loginState: LoginState;

    public constructor(configuration: OAuthConfiguration) {

        this._configuration = configuration;
        this._metadata = null;
        this._tokens = null;
        this._setupCallbacks();

        // Initialise state, used to correlate responses from the system browser with the original requests
        this._loginState = new LoginState();
    }

    /*
     * The user is logged in if there are valid tokens
     */
    public isLoggedIn(): boolean {
        return !!this._tokens;
    }

    /*
     * Try to get an existing access token
     */
    public async getAccessToken(): Promise<string | null> {

        if (this._tokens && this._tokens.accessToken) {
            return this._tokens.accessToken;
        }

        return null;
    }

    /*
     * Try to refresh an access token
     */
    public async refreshAccessToken(): Promise<string | null> {

        // Try to use the refresh token to get a new access token
        if (this._tokens && this._tokens.refreshToken) {

            // Do the work
            await this._performTokenRefresh();

            // Return the new token on success
            if (this._tokens && this._tokens.accessToken) {
                return this._tokens.accessToken;
            }
        }

        return null;
    }

    /*
     * Return the URL to the userinfo endpoint when requested
     */
    public getUserInfoEndpoint(): string {
        return this._metadata?.userInfoEndpoint || '';
    }

    /*
     * Do the login work
     */
    public async login(): Promise<void> {

        const result = await this._startLogin();
        if (result.error) {
            throw ErrorFactory.getFromLoginOperation(result.error, ErrorCodes.loginResponseFailed);
        }

        await this._endLogin(result);
    }

    /*
     * The first desktop sample just does a basic logoutby clearing tokens from memory
     */
    public logout(): void {
        this._resetDataOnLogout();
    }

    /*
     * This method is for testing only, to make the access token fail and act like it has expired
     * The corrupted access token will be sent to the API but rejected when introspected
     */
    public async expireAccessToken(): Promise<void> {

        if (this._tokens && this._tokens.accessToken) {
            this._tokens.accessToken = `${this._tokens.accessToken}x`;
        }
    }

    /*
     * This method is for testing only, to make the refresh token fail and act like it has expired
     * The corrupted refresh token will be sent to the Authorization Server but rejected
     */
    public async expireRefreshToken(): Promise<void> {

        if (this._tokens && this._tokens.refreshToken) {
            this._tokens.refreshToken = `${this._tokens.refreshToken}x`;
            this._tokens.accessToken = null;
        }
    }

    /*
     * A helper method to try to load metadata if required
     */
    private async _loadMetadata() {

        if (!this._metadata) {
            this._metadata = await AuthorizationServiceConfiguration.fetchFromIssuer(
                this._configuration.authority,
                new CustomRequestor());
        }
    }

    /*
     * Do the work of starting a login redirect
     */
    private async _startLogin(): Promise<LoginRedirectResult> {

        try {

            // Get a port to listen on and then start the loopback web server
            const server = new LoopbackWebServer(this._configuration, this._loginState);
            const runtimePort = await server.start();
            const redirectUri = `http://localhost:${runtimePort}`;

            // Download metadata from the Authorization server if required
            await this._loadMetadata();

            // Run a login on the system browser and get the result
            const adapter = new LoginAsyncAdapter(
                this._configuration,
                this._metadata!,
                this._loginState);
            return await adapter.login(redirectUri);

        } catch (e: any) {

            // Do error translation if required
            throw ErrorFactory.getFromLoginOperation(e, ErrorCodes.loginRequestFailed);
        }
    }

    /*
     * Swap the authorizasion code for a refresh token and access token
     */
    private async _endLogin(result: LoginRedirectResult): Promise<void> {

        try {

            // Get the PKCE verifier
            const codeVerifier = result.request.internal!['code_verifier'];

            // Supply PKCE parameters for the code exchange
            const extras: StringMap = {
                code_verifier: codeVerifier,
            };

            // Create the token request
            const requestJson = {
                grant_type: GRANT_TYPE_AUTHORIZATION_CODE,
                code: result.response!.code,
                redirect_uri: result.request.redirectUri,
                client_id: this._configuration.clientId,
                extras,
            };
            const tokenRequest = new TokenRequest(requestJson);

            // Execute the request to swap the code for tokens
            const requestor = new CustomRequestor();
            const tokenHandler = new BaseTokenRequestHandler(requestor);

            // Perform the authorization code grant exchange
            const tokenResponse = await tokenHandler.performTokenRequest(this._metadata!, tokenRequest);

            // Set values from the response
            const newTokenData = {
                accessToken: tokenResponse.accessToken,
                refreshToken: tokenResponse.refreshToken ? tokenResponse.refreshToken : null,
                idToken: tokenResponse.idToken ? tokenResponse.idToken : null,
            };

            // Update tokens in memory
            this._tokens = newTokenData;

        } catch (e: any) {

            // Do error translation if required
            ErrorFactory.getFromTokenError(e, ErrorCodes.authorizationCodeGrantFailed);
        }
    }

    /*
     * Do the work of the token refresh
     */
    private async _performTokenRefresh(): Promise<void> {

        try {

            // Download metadata from the Authorization server if required
            await this._loadMetadata();

            // Supply the scope for access tokens
            const extras: StringMap = {
                scope: this._configuration.scope,
            };

            // Create the token request
            const requestJson = {
                grant_type: GRANT_TYPE_REFRESH_TOKEN,
                client_id: this._configuration.clientId,
                refresh_token: this._tokens!.refreshToken!,
                redirect_uri: '',
                extras,
            };
            const tokenRequest = new TokenRequest(requestJson);

            // Execute the request to send the refresh token and get new tokens
            const requestor = new CustomRequestor();
            const tokenHandler = new BaseTokenRequestHandler(requestor);
            const tokenResponse = await tokenHandler.performTokenRequest(this._metadata!, tokenRequest);

            // Set values from the response, which may include a new rolling refresh token
            const newTokenData = {
                accessToken: tokenResponse.accessToken,
                refreshToken: tokenResponse.refreshToken ? tokenResponse.refreshToken : null,
                idToken: tokenResponse.idToken ? tokenResponse.idToken : null,
            };

            // Maintain existing details if required
            if (!newTokenData.refreshToken) {
                newTokenData.refreshToken = this._tokens!.refreshToken;
            }
            if (!newTokenData.idToken) {
                newTokenData.idToken = this._tokens!.idToken;
            }

            // Update tokens in memory and secure storage
            this._tokens = newTokenData;

        } catch (e: any) {

            if (e.error === ErrorCodes.refreshTokenExpired) {

                // Handle refresh token expired errors by clearing all token data
                this._resetDataOnLogout();

            } else {

                // Report unexpected errors
                throw ErrorFactory.getFromTokenError(e, ErrorCodes.tokenRefreshFailed);
            }
        }
    }

    /*
     * Clear data when the session expires or the user logs out
     */
    private async _resetDataOnLogout(): Promise<void> {
        this._tokens = null;
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks() {
        this._endLogin = this._endLogin.bind(this);
    }
}
