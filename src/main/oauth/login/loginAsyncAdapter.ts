import {
    AuthorizationError,
    AuthorizationNotifier,
    AuthorizationRequest,
    AuthorizationRequestJson,
    AuthorizationResponse,
    AuthorizationServiceConfiguration} from '@openid/appauth';
import {OAuthConfiguration} from '../../configuration/oauthConfiguration';
import {NodeCrypto} from '../../utilities/nodeCrypto';
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

        // Create the authorization request and use prompt=login to force a new login
        // Note however that AWS Cognito does not support that parameter
        const requestJson = {
            response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
            client_id: this._configuration.clientId,
            redirect_uri: redirectUri,
            scope: this._configuration.scope,
            extras: {
                'prompt': 'login',
            },
        } as AuthorizationRequestJson;
        const authorizationRequest = new AuthorizationRequest(requestJson, new NodeCrypto(), true);

        // Set up PKCE for the redirect
        await authorizationRequest.setupCodeVerifier();

        // Wrap the AppAuth notifier in a promise
        const notifier = new AuthorizationNotifier();
        const promise = new Promise<LoginRedirectResult>((resolve) => {

            notifier.setAuthorizationListener(async (
                request: AuthorizationRequest,
                response: AuthorizationResponse | null,
                error: AuthorizationError | null) => {

                resolve({request, response, error});
            });
        });

        // Spin up the browser and begin the login
        const browserLoginRequestHandler = new BrowserLoginRequestHandler(this._state);
        browserLoginRequestHandler.setAuthorizationNotifier(notifier);
        await browserLoginRequestHandler.performAuthorizationRequest(this._metadata, authorizationRequest);

        // Wait for the result
        return await promise;
    }
}
