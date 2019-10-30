import * as FindFreePort from 'find-free-port';
import * as Http from 'http';
import * as Url from 'url';
import {OAuthConfiguration} from '../../configuration/oauthConfiguration';
import {UIError} from '../errors/uiError';
import {LoginEvents} from './loginEvents';
import {LoginState} from './loginState';

/*
 * Manage the local web server which listens on a loopback URL on the desktop user's PC
 */
export class LoopbackWebServer {

    /*
     * Configure the web server
     */
    public static configure(oauthConfig: OAuthConfiguration) {
        LoopbackWebServer._oauthConfig = oauthConfig;
    }

    /*
     * Start the server if it is not started already
     */
    public static async start(): Promise<void> {
        if (!LoopbackWebServer._server) {
            return await LoopbackWebServer._startServer();
        }
    }

    /*
     * Add to the login state so that the correct response data is used for each request
     */
    public static addCorrelationState(state: string, loginEvents: LoginEvents): void {
        return LoopbackWebServer._loginState.addState(state, loginEvents);
    }

    /*
     * Allow the creator to get the port
     */
    public static get runtimePort(): number {
        return LoopbackWebServer._runtimePort;
    }

    /*
     * The web server stores login state across all attempts
     */
    private static _loginState: LoginState = new LoginState();
    private static _oauthConfig: OAuthConfiguration;
    private static _server: Http.Server | null;
    private static _runtimePort: number;

    /*
     * Handle starting the server
     */
    private static async _startServer(): Promise<void> {

        // Get a port to listen on
        LoopbackWebServer._runtimePort = await LoopbackWebServer._getRuntimeLoopbackPort();

        // Create the server to receive the login response
        LoopbackWebServer._server = Http.createServer(this._handleBrowserRequest);

        // Start listening for requests
        LoopbackWebServer._server.listen(LoopbackWebServer._runtimePort);
    }

    /*
     * Get a runtime free port to listen on and form the loopback URL that will receive the response
     * Note that we use ports above 1024 which work for low privilege users
     */
    private static async _getRuntimeLoopbackPort(): Promise<number> {

        // Adapt the 2 argument callback into a promise so that it fits with async / await
        return new Promise<number>((resolve, reject) => {

            FindFreePort(
                LoopbackWebServer._oauthConfig.loopbackMinPort,
                LoopbackWebServer._oauthConfig.loopbackMaxPort,
                'localhost',
                1,
                (err: any, freePort: number) => {

                    if (err) {
                        return reject(err);
                    }

                    return resolve(freePort);
            });
        });
    }

    /*
     * Handle an incoming request from the browser running at a URL such as http://localhost:8001
     */
    private static _handleBrowserRequest(request: Http.IncomingMessage, response: Http.ServerResponse): void {

        if (!request.url) {
            return;
        }

        // Get parts of the request
        const url = Url.parse(request.url);
        const searchParams = new Url.URLSearchParams(url.query || '');
        const queryParams = {
            state: searchParams.get('state'),
            code: searchParams.get('code'),
            error: searchParams.get('error'),
        };

        // Check we have a state parameter
        if (!queryParams.state) {
            return;
        }

        // Look up context for the corresponding outgoing request
        const loginEvents = LoopbackWebServer._loginState.getEvents(queryParams.state);
        if (loginEvents) {

            // Raise the authorization response event to process the received authorization code
            loginEvents.emit(LoginEvents.ON_AUTHORIZATION_RESPONSE, queryParams);

            // Wait for a response completed event so that we can take different actions on success or failure
            loginEvents.once(LoginEvents.ON_AUTHORIZATION_RESPONSE_COMPLETED, (result: any) => {

                // Clear state we used to handle reentrancy
                LoopbackWebServer._loginState.removeState(queryParams.state!);

                // See if the login was successful
                const error = result as UIError | null;

                // The browser will be redirected to either a success or error page
                const browserPage = error ?
                    LoopbackWebServer._oauthConfig.postLoginBrowserError :
                    LoopbackWebServer._oauthConfig.postLoginBrowserSuccess;

                // Do the redirect
                response.writeHead(301, {
                    Location: browserPage,
                });
                response.end();

                // Stop the web server now that the login attempt has finished
                LoopbackWebServer._server!.close();
                LoopbackWebServer._server = null;
            });
        }
    }
}
