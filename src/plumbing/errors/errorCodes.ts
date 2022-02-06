/*
 * Error codes that the UI can program against
 */
export class ErrorCodes {

    // Used to indicate that the API cannot be called until the user logs in
    public static readonly loginRequired = 'login_required';

    // A technical error starting a login request, such as contacting the metadata endpoint
    public static readonly loginRequestFailed = 'login_request_failed';

    // A technical error processing the login response containing the authorization code
    public static readonly loginResponseFailed = 'login_response_failed';

    // A technical error processing the login response containing the authorization code
    public static readonly authorizationCodeGrantFailed = 'authorization_code_grant_failed';

    // The OAuth error when a refresh token expires due to a technical problem
    public static readonly tokenRefreshFailed = 'token_refresh_failed';

    // The OAuth error when a refresh token expires
    public static readonly refreshTokenExpired = 'invalid_grant';

    // A general exception in the UI
    public static readonly generalUIError = 'general_ui_error';

    // An error making an Ajax call to get API data
    public static readonly networkError = 'network_error';

    // An error receiving API data as JSON
    public static readonly jsonDataError = 'json_data_error';

    // An error response fropm the API
    public static readonly responseError = 'response_error';

    // Returned by the API when the user edits the browser URL and ties to access an unauthorised company
    public static readonly companyNotFound = 'company_not_found';

    // Returned by the API when the user edits the browser URL and supplies a non numeric company id
    public static readonly invalidCompanyId = 'invalid_company_id';
}
