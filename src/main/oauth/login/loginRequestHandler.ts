import {
    AuthorizationError,
    AuthorizationNotifier,
    AuthorizationRequest,
    AuthorizationRequestHandler,
    AuthorizationRequestResponse,
    AuthorizationResponse,
    AuthorizationServiceConfiguration,
    BasicQueryStringUtils} from '@openid/appauth';
import open from 'open';
import {OAuthConfiguration} from '../../configuration/oauthConfiguration';
import {NodeCrypto} from '../../utilities/nodeCrypto';
import {LoginRedirectResult} from './loginRedirectResult';
import {LoginState} from './loginState';

/*
 * An override of the default authorization handler to perform a login
 */
export class LoginRequestHandler extends AuthorizationRequestHandler {

    private readonly _configuration: OAuthConfiguration;
    private readonly _metadata: AuthorizationServiceConfiguration;
    private readonly _state: LoginState;
    private _response: AuthorizationRequestResponse | null;

    public constructor(
        configuration: OAuthConfiguration,
        metadata: AuthorizationServiceConfiguration,
        state: LoginState) {

        super(new BasicQueryStringUtils(), new NodeCrypto());
        this._configuration = configuration;
        this._metadata = metadata;
        this._state = state;
        this._response = null;
    }

    /*
     * Run the login redirect and listen for the response
     */
    public async execute(redirectUri: string): Promise<LoginRedirectResult> {

        // Create the authorization request message and use prompt=login to force a new login
        // Note however that AWS Cognito does not support that parameter
        const requestJson = {
            response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
            client_id: this._configuration.clientId,
            redirect_uri: redirectUri,
            scope: this._configuration.scope,
            extras: {
                'prompt': 'login',
            },
        };
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
        this.setAuthorizationNotifier(notifier);
        await this.performAuthorizationRequest(this._metadata, authorizationRequest);

        // Wait for the result
        return await promise;
    }

    /*
     * Use the AppAuth class to form the OAuth URL, then make the login request on the system browser
     */
    public async performAuthorizationRequest(
        metadata: AuthorizationServiceConfiguration,
        request: AuthorizationRequest): Promise<void> {

        // Create a callback to handle the response when a deep link is received
        const callback = async (args: URLSearchParams | null) => {

            if (args) {
                this._response = this._handleBrowserLoginResponse(args, request);
                super.completeAuthorizationRequestIfPossible();
            }
        };

        // Store the callback mapped to the OAuth state parameter
        this._state.storeLoginCallback(request.state, callback);

        // Form the authorization request using the AppAuth base class and open the system browser there
        await open(this.buildRequestUrl(metadata, request));
    }

    /*
     * Return data back to the authenticator's notifier
     */
    protected async completeAuthorizationRequest(): Promise<AuthorizationRequestResponse | null> {
        return this._response;
    }

    /*
     * Collect response data to return to the caller
     */
    private _handleBrowserLoginResponse(
        args: URLSearchParams,
        request: AuthorizationRequest): AuthorizationRequestResponse {

        // Get strongly typed fields
        const state = args.get('state') || '';
        const code = args.get('code') || '';
        const error = args.get('error') || '';

        // Initialize the result
        let authorizationResponse: AuthorizationResponse | null = null;
        let authorizationError: AuthorizationError | null = null;

        if (error) {

            // Handle error responses
            const errorDescription = args.get('error_description') || '';
            const errorJson = {
                error,
                error_description: errorDescription || '',
            };
            authorizationError = new AuthorizationError(errorJson);

        } else {

            // Create a success response containing the code, which we will next swap for tokens
            const responseJson = {
                code,
                state,
            };
            authorizationResponse = new AuthorizationResponse(responseJson);
        }

        // Return the full authorization response data
        return {
            request,
            response: authorizationResponse,
            error: authorizationError,
        };
    }
}
