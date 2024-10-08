import {
    AuthorizationRequestResponse,
    AuthorizationServiceConfiguration,
    BaseTokenRequestHandler,
    GRANT_TYPE_AUTHORIZATION_CODE,
    GRANT_TYPE_REFRESH_TOKEN,
    TokenRequest} from '@openid/appauth';
import EventEmitter from 'node:events';
import {ErrorCodes} from '../../shared/errors/errorCodes';
import {ErrorFactory} from '../../shared/errors/errorFactory';
import {OAuthConfiguration} from '../configuration/oauthConfiguration';
import {HttpProxy} from '../utilities/httpProxy';
import {AuthenticatorService} from './authenticatorService';
import {CustomRequestor} from './customRequestor';
import {LoginRequestHandler} from './loginRequestHandler';
import {LoginState} from './loginState';
import {LoopbackWebServer} from './loopbackWebServer';
import {TokenData} from './tokenData';

/*
 * The entry point class for login and token requests
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
export class AuthenticatorServiceImpl implements AuthenticatorService {

    private readonly _configuration: OAuthConfiguration;
    private readonly _customRequestor: CustomRequestor;
    private _tokens: TokenData | null;
    private _metadata: AuthorizationServiceConfiguration | null;
    private readonly _loginState: LoginState;
    private readonly _eventEmitter: EventEmitter;

    public constructor(configuration: OAuthConfiguration, httpProxy: HttpProxy) {

        this._configuration = configuration;
        this._customRequestor = new CustomRequestor(httpProxy);
        this._metadata = null;
        this._tokens = null;
        this._loginState = new LoginState();
        this._eventEmitter = new EventEmitter();
        this._setupCallbacks();
    }

    /*
     * The user is logged in if there are valid tokens
     */
    public isLoggedIn(): boolean {
        return !!this._tokens;
    }

    /*
     * Return the URL to the userinfo endpoint when requested
     */
    public async getUserInfoEndpoint(): Promise<string | null> {
        await this._loadMetadata();
        return this._metadata?.userInfoEndpoint || null;
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
     * Do the login work
     */
    public async login(): Promise<void> {

        const result = await this._startLogin();
        if (result.error) {
            throw ErrorFactory.fromLoginOperation(result.error, ErrorCodes.loginResponseFailed);
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
    public expireAccessToken(): void {

        if (this._tokens && this._tokens.accessToken) {
            this._tokens.accessToken = `${this._tokens.accessToken}x`;
        }
    }

    /*
     * This method is for testing only, to make the refresh token fail and act like it has expired
     * The corrupted refresh token will be sent to the authorization server but rejected
     */
    public expireRefreshToken(): void {

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
                this._customRequestor);
        }
    }

    /*
     * Do the work of starting a login redirect
     */
    private async _startLogin(): Promise<AuthorizationRequestResponse> {

        try {

            // Get a port to listen on and then start the loopback web server
            const server = new LoopbackWebServer(this._configuration, this._eventEmitter);
            const runtimePort = await server.start();
            const host = this._configuration.loopbackHostname;
            const redirectUri = `http://${host}:${runtimePort}${this._configuration.redirectPath}`;

            // Download metadata from the authorization server if required
            await this._loadMetadata();

            // Run a login on the system browser and get the result
            const handler = new LoginRequestHandler(
                this._configuration,
                this._metadata!,
                this._loginState,
                this._eventEmitter);
            return await handler.execute(redirectUri);

        } catch (e: any) {

            // Do error translation if required
            throw ErrorFactory.fromLoginOperation(e, ErrorCodes.loginRequestFailed);
        }
    }

    /*
     * Swap the authorization code for a refresh token and access token
     */
    private async _endLogin(result: AuthorizationRequestResponse): Promise<void> {

        try {

            // Create the token request including the PKCE code verifier
            const requestJson = {
                grant_type: GRANT_TYPE_AUTHORIZATION_CODE,
                code: result.response!.code,
                redirect_uri: result.request.redirectUri,
                client_id: this._configuration.clientId,
                extras: {
                    code_verifier: result.request.internal!['code_verifier'],
                },
            };
            const tokenRequest = new TokenRequest(requestJson);

            // Execute the request to swap the code for tokens
            const tokenRequestHandler = new BaseTokenRequestHandler(this._customRequestor);

            // Perform the authorization code grant exchange
            const tokenResponse = await tokenRequestHandler.performTokenRequest(this._metadata!, tokenRequest);

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
            throw ErrorFactory.fromTokenError(e, ErrorCodes.authorizationCodeGrantFailed);
        }
    }

    /*
     * Do the work of the token refresh
     */
    private async _performTokenRefresh(): Promise<void> {

        try {

            // Download metadata from the authorization server if required
            await this._loadMetadata();

            // Create the token request
            const requestJson = {
                grant_type: GRANT_TYPE_REFRESH_TOKEN,
                client_id: this._configuration.clientId,
                refresh_token: this._tokens!.refreshToken!,
                redirect_uri: '',
            };
            const tokenRequest = new TokenRequest(requestJson);

            // Execute the request to send the refresh token and get new tokens
            const tokenRequestHandler = new BaseTokenRequestHandler(this._customRequestor);
            const tokenResponse = await tokenRequestHandler.performTokenRequest(this._metadata!, tokenRequest);

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
                throw ErrorFactory.fromTokenError(e, ErrorCodes.tokenRefreshFailed);
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
