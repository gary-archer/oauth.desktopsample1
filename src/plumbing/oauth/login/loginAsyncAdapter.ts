import {
    AuthorizationError,
    AuthorizationNotifier,
    AuthorizationRequest,
    AuthorizationResponse,
    AuthorizationServiceConfiguration,
    DefaultCrypto} from '@openid/appauth';
import {OAuthConfiguration} from '../../../configuration/oauthConfiguration';
import {BrowserLoginRequestHandler} from './browserLoginRequestHandler';
import {LoginRedirectResult} from './loginRedirectResult';
import {LoginState} from './loginState';

/*
 * The AppAuth-JS class uses some old Node.js style callbacks
 * This class adapts them to a modern async await syntax
 */
export class LoginAsyncAdapter {

    private readonly _configuration: OAuthConfiguration;
    private readonly _metadata: AuthorizationServiceConfiguration;
    private readonly _state: LoginState;

    public constructor(
        configuration: OAuthConfiguration,
        metadata: AuthorizationServiceConfiguration,
        state: LoginState) {

        this._configuration = configuration;
        this._metadata = metadata;
        this._state = state;
    }

    /*
     * Start the login redirect and listen for the response
     */
    public async login(redirectUri: string): Promise<LoginRedirectResult> {

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
                    resolve({request, response, error});

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
}
