import {
    AuthorizationError,
    AuthorizationRequest,
    AuthorizationRequestHandler,
    AuthorizationRequestResponse,
    AuthorizationResponse,
    AuthorizationServiceConfiguration,
    BasicQueryStringUtils} from '@openid/appauth';
import EventEmitter from 'node:events';
import open from 'open';
import {ErrorFactory} from '../../shared/errors/errorFactory';
import {OAuthConfiguration} from '../configuration/oauthConfiguration';
import {LoginState} from './loginState';
import {NodeCrypto} from './nodeCrypto';

/*
 * An override of the default authorization handler to perform a login
 */
export class LoginRequestHandler extends AuthorizationRequestHandler {

    private readonly _configuration: OAuthConfiguration;
    private readonly _metadata: AuthorizationServiceConfiguration;
    private readonly _state: LoginState;
    private readonly _eventEmitter: EventEmitter;

    public constructor(
        configuration: OAuthConfiguration,
        metadata: AuthorizationServiceConfiguration,
        state: LoginState,
        eventEmitter: EventEmitter) {

        super(new BasicQueryStringUtils(), new NodeCrypto());

        this._configuration = configuration;
        this._metadata = metadata;
        this._state = state;
        this._eventEmitter = eventEmitter;
    }

    /*
     * Run the login redirect and listen for the response
     */
    public async execute(redirectUri: string): Promise<AuthorizationRequestResponse> {

        // Set request parameters and use prompt=login to force a new login
        const requestJson = {
            response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
            client_id: this._configuration.clientId,
            redirect_uri: redirectUri,
            scope: this._configuration.scope,
            extras: {
                'prompt': 'login',
            },
        };

        // Create the request
        const authorizationRequest = new AuthorizationRequest(requestJson, new NodeCrypto(), true);
        await authorizationRequest.setupCodeVerifier();

        // Wait for a response from the loopback web server
        const promise = new Promise<AuthorizationRequestResponse>((resolve, reject) => {

            // Store the request data and use it later to handle re-entrancy
            this._state.storeRequest(authorizationRequest);

            // When we get a response, make sure we use the matching request to complete the flow
            this._eventEmitter.once('LOGIN_COMPLETE', (args: URLSearchParams) => {

                const state = args.get('state') || '';
                const foundRequest = this._state.getRequestForState(state);
                if (!foundRequest) {
                    reject(ErrorFactory.fromLoginCancelled());
                    return;
                }

                this._state.clear();
                resolve(this._handleBrowserLoginResponse(args, foundRequest));
            });
        });

        // Send an authorization request on the browser, which gets redirected to the loopback web server
        await this.performAuthorizationRequest(this._metadata, authorizationRequest);
        return await promise;
    }

    /*
     * Use this required AppAuth method to spin up the system browser
     */
    public async performAuthorizationRequest(
        metadata: AuthorizationServiceConfiguration,
        request: AuthorizationRequest): Promise<void> {

        await open(this.buildRequestUrl(metadata, request));
    }

    /*
     * Provide a null implementation since we do our own completion
     */
    protected async completeAuthorizationRequest(): Promise<AuthorizationRequestResponse | null> {
        return null;
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
