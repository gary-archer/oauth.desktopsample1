import {
    AuthorizationError,
    AuthorizationRequest,
    AuthorizationRequestHandler,
    AuthorizationRequestResponse,
    AuthorizationResponse,
    AuthorizationServiceConfiguration,
    BasicQueryStringUtils,
    DefaultCrypto} from '@openid/appauth';
import Opener from 'opener';
import {LoginState} from './loginState';

/*
 * An override of the default authorization handler to perform a login
 */
export class BrowserLoginRequestHandler extends AuthorizationRequestHandler {

    private readonly _state: LoginState;
    private _authorizationPromise: Promise<AuthorizationRequestResponse> | null;

    /*
     * Set up the base class
     */
    public constructor(state: LoginState) {

        super(new BasicQueryStringUtils(), new DefaultCrypto());
        this._state = state;
        this._authorizationPromise = null;
    }

    /*
     * Use the AppAuth class to form the OAuth URL, then make the login request on the system browser
     */
    public performAuthorizationRequest(
        metadata: AuthorizationServiceConfiguration,
        request: AuthorizationRequest): void {

        // Create a promise to handle the response from the browser
        this._authorizationPromise = new Promise<AuthorizationRequestResponse>((resolve) => {

            // Create a callback to wait for completion
            const callback = (args: URLSearchParams) => {

                // Package up data into an object and then resolve our promise
                const response = this._handleBrowserLoginResponse(args, request);
                resolve(response);

                // Ask the base class to call our completeAuthorizationRequest
                this.completeAuthorizationRequestIfPossible();
            };

            // Store login state so that we can receive the response
            this._state.storeLoginCallback(request.state, callback);
        });

        // Form the OAuth request
        const loginUrl = this.buildRequestUrl(metadata, request);

        // Invoke the browser
        Opener(loginUrl);
    }

    /*
     * Return data back to the authenticator's notifier
     */
    protected async completeAuthorizationRequest(): Promise<AuthorizationRequestResponse | null> {

        return this._authorizationPromise;
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
