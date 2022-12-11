import {
    AuthorizationError,
    AuthorizationNotifier,
    AuthorizationRequest,
    AuthorizationResponse,
    AuthorizationServiceConfiguration,
    DefaultCrypto} from '@openid/appauth';
import {OAuthConfiguration} from '../../../configuration/oauthConfiguration';
import {ErrorCodes} from '../../errors/errorCodes';
import {ErrorFactory} from '../../errors/errorFactory';
import {LoopbackWebServer} from '../utilities/loopbackWebServer';
import {BrowserLoginRequestHandler} from './browserLoginRequestHandler';
import {LoginState} from './loginState';

/*
 * A class to handle the plumbing of login redirects via the system browser
 */
export class LoginManager {

    private readonly _configuration: OAuthConfiguration;
    private readonly _metadata: AuthorizationServiceConfiguration;
    private readonly _state: LoginState;
    private readonly _onCodeReceived: (code: string, redirectUri: string, verifier: string) => Promise<void>;

    public constructor(
        configuration: OAuthConfiguration,
        metadata: AuthorizationServiceConfiguration,
        state: LoginState,
        onCodeReceived: (code: string, redirectUri: string, verifier: string) => Promise<void>) {

        this._configuration = configuration;
        this._metadata = metadata;
        this._state = state;
        this._onCodeReceived = onCodeReceived;
    }

    /*
     * Start the login redirect and listen for the response
     */
    public async login(): Promise<void> {

        // Get a port to listen on and then start the loopback web server
        const server = new LoopbackWebServer(this._configuration, this._state);
        const runtimePort = await server.start();

        // Get the redirect URI, which will be a value such as http://localhost:8001
        const redirectUri = `http://localhost:${runtimePort}`;

        // Create the authorization request
        const requestJson = {
            response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
            client_id: this._configuration.clientId,
            redirect_uri: redirectUri,
            scope: this._configuration.scope,
        };
        const authorizationRequest = new AuthorizationRequest(requestJson, new DefaultCrypto(), true);

        // Set up PKCE for the redirect, which avoids native app vulnerabilities
        await authorizationRequest.setupCodeVerifier();

        // Wrap the AppAuth-JS callbacks in a promise
        return new Promise((resolve, reject) => {

            // Use the AppAuth mechanism of a notifier to receive the login result
            const notifier = new AuthorizationNotifier();
            notifier.setAuthorizationListener(async (
                request: AuthorizationRequest,
                response: AuthorizationResponse | null,
                error: AuthorizationError | null) => {

                try {
                    await this._handleLoginResponse(request, response, error, redirectUri);
                    resolve();

                } catch (e: any) {
                    reject(e);
                }
            });

            // Start the login redirect on a custom browser handler
            const browserLoginRequestHandler = new BrowserLoginRequestHandler(this._state);
            browserLoginRequestHandler.setAuthorizationNotifier(notifier);
            browserLoginRequestHandler.performAuthorizationRequest(this._metadata, authorizationRequest);
        });
    }

    /*
     * Start the second phase of login, to swap the authorization code for tokens
     */
    private async _handleLoginResponse(
        request: AuthorizationRequest,
        response: AuthorizationResponse | null,
        error: AuthorizationError | null,
        redirectUri: string): Promise<void> {

        // The first phase of login has completed
        if (error) {
            throw ErrorFactory.getFromLoginOperation(error, ErrorCodes.loginResponseFailed);
        }

        try {

            // Get the PKCE verifier
            const codeVerifierKey = 'code_verifier';
            const codeVerifier = request.internal![codeVerifierKey];

            // Swap the authorization code for tokens
            await this._onCodeReceived(response!.code, redirectUri, codeVerifier);

        } catch (e) {

            throw ErrorFactory.getFromTokenError(e, ErrorCodes.authorizationCodeGrantFailed);
        }
    }
}
