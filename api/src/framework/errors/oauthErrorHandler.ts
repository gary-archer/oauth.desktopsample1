import {FrameworkConfiguration} from '../configuration/frameworkConfiguration';
import {ApiError} from './apiError';
import {ClientError} from './clientError';
import {ExceptionHelper} from './exceptionHelper';

/*
 * OAuth specific error processing
 */
export class OAuthErrorHandler {

    private readonly _configuration: FrameworkConfiguration;

    public constructor(configuration: FrameworkConfiguration) {
        this._configuration = configuration;
    }

    /*
     * Handle the request promise error for metadata lookup failures
     */
    public fromMetadataError(responseError: any, url: string): ApiError {

        const apiError = new ApiError(
            this._configuration.apiName,
            'metadata_lookup_failure',
            'Metadata lookup failed');
        this._setErrorDetails(apiError, null, responseError, url);
        return apiError;
    }

    /*
     * Handle the request promise error for introspection failures
     */
    public fromIntrospectionError(responseError: any, url: string): ApiError | ClientError {

        // Avoid reprocessing
        if (responseError instanceof ApiError) {
            return responseError;
        }
        if (responseError instanceof ClientError) {
            return responseError;
        }

        const [code, description] = this._readOAuthErrorResponse(responseError);
        const apiError = this._createOAuthApiError('introspection_failure', 'Token validation failed', code);
        this._setErrorDetails(apiError, description, responseError, url);
        return apiError;
    }

    /*
     * Handle user info lookup failures
     */
    public fromUserInfoError(responseError: any, url: string): ApiError {

        // Handle a race condition where the access token expires during user info lookup
        if (responseError.error && responseError.error === 'invalid_token') {
            throw ClientError.create401('Access token expired during user info lookup');
        }

        // Avoid reprocessing
        if (responseError instanceof ApiError) {
            return responseError;
        }

        const [code, description] = this._readOAuthErrorResponse(responseError);
        const apiError = this._createOAuthApiError('userinfo_failure', 'User info lookup failed', code);
        this._setErrorDetails(apiError, description, responseError, url);
        return apiError;
    }

    /*
     * The error thrown if we cannot find an expected claim during OAuth processing
     */
    public fromMissingClaim(claimName: string): ApiError {

        const apiError = new ApiError(
            this._configuration.apiName,
            'claims_failure',
            'Authorization Data Not Found');
        apiError.details = `An empty value was found for the expected claim ${claimName}`;
        return apiError;
    }

    /*
     * Return the error and error_description fields from an OAuth error message if present
     */
    private _readOAuthErrorResponse(responseError: any): [string | null, string | null] {

        let code = null;
        let description = null;

        if (responseError.error) {
            code = responseError.error;
        }

        if (responseError.error_description) {
            description = responseError.error_description;
        }

        return [code, description];
    }

    /*
     * Create an error object from an error code and include the OAuth error code in the user message
     */
    private _createOAuthApiError(errorCode: string, userMessage: string, oauthErrorCode: string | null): ApiError {

        // Include the OAuth error code in the short technical message returned
        let message = userMessage;
        if (errorCode) {
            message += ` : ${errorCode}`;
        }

        return new ApiError(this._configuration.apiName, errorCode, message);
    }

    /*
     * Concatenate parts of an error
     */
    private _setErrorDetails(error: ApiError, oauthDetails: string | null, responseError: any, url: string): void {

        // First set details
        let detailsText = '';
        if (oauthDetails) {
            detailsText += oauthDetails;
        } else {
            detailsText += ExceptionHelper.getExceptionDetailsMessage(responseError);
        }

        if (url) {
            detailsText += `, URL: ${url}`;
        }
        error.details = detailsText;

        // Next include the original call stack
        if (responseError.stack) {
            error.addToStackFrames(responseError.stack);
        }
    }
}
