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
import {OAuthService} from './oauthService';
import {CustomRequestor} from './customRequestor';
import {LoginRequestHandler} from './loginRequestHandler';
import {LoginState} from './loginState';
import {LoopbackWebServer} from './loopbackWebServer';
import {TokenData} from './tokenData';

/*
 * The entry point class for login and token requests
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
export class OAuthServiceImpl implements OAuthService {

    private readonly configuration: OAuthConfiguration;
    private readonly customRequestor: CustomRequestor;
    private readonly loginState: LoginState;
    private readonly eventEmitter: EventEmitter;
    private tokens: TokenData | null;
    private metadata: AuthorizationServiceConfiguration | null;

    public constructor(configuration: OAuthConfiguration, httpProxy: HttpProxy) {

        this.configuration = configuration;
        this.customRequestor = new CustomRequestor(httpProxy);
        this.metadata = null;
        this.tokens = null;
        this.loginState = new LoginState();
        this.eventEmitter = new EventEmitter();
        this.setupCallbacks();
    }

    /*
     * The user is logged in if there are valid tokens
     */
    public isLoggedIn(): boolean {
        return !!this.tokens;
    }

    /*
     * Return the URL to the userinfo endpoint when requested
     */
    public async getUserInfoEndpoint(): Promise<string | null> {
        await this.loadMetadata();
        return this.metadata?.userInfoEndpoint || null;
    }

    /*
     * Try to get an existing access token
     */
    public async getAccessToken(): Promise<string | null> {

        if (this.tokens && this.tokens.accessToken) {
            return this.tokens.accessToken;
        }

        return null;
    }

    /*
     * Try to refresh an access token
     */
    public async refreshAccessToken(): Promise<string | null> {

        // Try to use the refresh token to get a new access token
        if (this.tokens && this.tokens.refreshToken) {

            // Do the work
            await this.performTokenRefresh();

            // Return the new token on success
            if (this.tokens && this.tokens.accessToken) {
                return this.tokens.accessToken;
            }
        }

        return null;
    }

    /*
     * Do the login work
     */
    public async login(): Promise<void> {

        const result = await this.startLogin();
        if (result.error) {
            throw ErrorFactory.fromLoginOperation(result.error, ErrorCodes.loginResponseFailed);
        }

        await this.endLogin(result);
    }

    /*
     * The first desktop sample just does a basic logoutby clearing tokens from memory
     */
    public logout(): void {
        this.resetDataOnLogout();
    }

    /*
     * This method is for testing only, to make the access token fail and act like it has expired
     * The corrupted access token will be sent to the API but rejected when introspected
     */
    public expireAccessToken(): void {

        if (this.tokens && this.tokens.accessToken) {
            this.tokens.accessToken = `${this.tokens.accessToken}x`;
        }
    }

    /*
     * This method is for testing only, to make the refresh token fail and act like it has expired
     * The corrupted refresh token will be sent to the authorization server but rejected
     */
    public expireRefreshToken(): void {

        if (this.tokens && this.tokens.refreshToken) {
            this.tokens.refreshToken = `${this.tokens.refreshToken}x`;
            this.tokens.accessToken = null;
        }
    }

    /*
     * A helper method to try to load metadata if required
     */
    private async loadMetadata() {

        if (!this.metadata) {
            this.metadata = await AuthorizationServiceConfiguration.fetchFromIssuer(
                this.configuration.authority,
                this.customRequestor);
        }
    }

    /*
     * Do the work of starting a login redirect
     */
    private async startLogin(): Promise<AuthorizationRequestResponse> {

        try {

            // Get a port to listen on and then start the loopback web server
            const server = new LoopbackWebServer(this.configuration, this.eventEmitter);
            const runtimePort = await server.start();
            const host = this.configuration.loopbackHostname;
            const redirectUri = `http://${host}:${runtimePort}${this.configuration.redirectPath}`;

            // Download metadata from the authorization server if required
            await this.loadMetadata();

            // Run a login on the system browser and get the result
            const handler = new LoginRequestHandler(
                this.configuration,
                this.metadata!,
                this.loginState,
                this.eventEmitter);
            return await handler.execute(redirectUri);

        } catch (e: any) {

            // Do error translation if required
            throw ErrorFactory.fromLoginOperation(e, ErrorCodes.loginRequestFailed);
        }
    }

    /*
     * Swap the authorization code for a refresh token and access token
     */
    private async endLogin(result: AuthorizationRequestResponse): Promise<void> {

        try {

            // Create the token request including the PKCE code verifier
            const requestJson = {
                grant_type: GRANT_TYPE_AUTHORIZATION_CODE,
                code: result.response!.code,
                redirect_uri: result.request.redirectUri,
                client_id: this.configuration.clientId,
                extras: {
                    code_verifier: result.request.internal!['code_verifier'],
                },
            };
            const tokenRequest = new TokenRequest(requestJson);

            // Execute the request to swap the code for tokens
            const tokenRequestHandler = new BaseTokenRequestHandler(this.customRequestor);

            // Perform the authorization code grant exchange
            const tokenResponse = await tokenRequestHandler.performTokenRequest(this.metadata!, tokenRequest);

            // Set values from the response
            const newTokenData = {
                accessToken: tokenResponse.accessToken,
                refreshToken: tokenResponse.refreshToken ? tokenResponse.refreshToken : null,
                idToken: tokenResponse.idToken ? tokenResponse.idToken : null,
            };

            // Update tokens in memory
            this.tokens = newTokenData;

        } catch (e: any) {

            // Do error translation if required
            throw ErrorFactory.fromTokenError(e, ErrorCodes.authorizationCodeGrantFailed);
        }
    }

    /*
     * Do the work of the token refresh
     */
    private async performTokenRefresh(): Promise<void> {

        try {

            // Download metadata from the authorization server if required
            await this.loadMetadata();

            // Create the token request
            const requestJson = {
                grant_type: GRANT_TYPE_REFRESH_TOKEN,
                client_id: this.configuration.clientId,
                refresh_token: this.tokens!.refreshToken!,
                redirect_uri: '',
            };
            const tokenRequest = new TokenRequest(requestJson);

            // Execute the request to send the refresh token and get new tokens
            const tokenRequestHandler = new BaseTokenRequestHandler(this.customRequestor);
            const tokenResponse = await tokenRequestHandler.performTokenRequest(this.metadata!, tokenRequest);

            // Set values from the response, which may include a new rolling refresh token
            const newTokenData = {
                accessToken: tokenResponse.accessToken,
                refreshToken: tokenResponse.refreshToken ? tokenResponse.refreshToken : null,
                idToken: tokenResponse.idToken ? tokenResponse.idToken : null,
            };

            // Maintain existing details if required
            if (!newTokenData.refreshToken) {
                newTokenData.refreshToken = this.tokens!.refreshToken;
            }
            if (!newTokenData.idToken) {
                newTokenData.idToken = this.tokens!.idToken;
            }

            // Update tokens in memory and secure storage
            this.tokens = newTokenData;

        } catch (e: any) {

            if (e.error === ErrorCodes.refreshTokenExpired) {

                // Handle refresh token expired errors by clearing all token data
                this.resetDataOnLogout();

            } else {

                // Report unexpected errors
                throw ErrorFactory.fromTokenError(e, ErrorCodes.tokenRefreshFailed);
            }
        }
    }

    /*
     * Clear data when the session expires or the user logs out
     */
    private async resetDataOnLogout(): Promise<void> {
        this.tokens = null;
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private setupCallbacks() {
        this.endLogin = this.endLogin.bind(this);
    }
}
