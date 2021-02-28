
import FindFreePort from 'find-free-port';
import Http from 'http';
import Url from 'url';
import {OAuthConfiguration} from '../../../configuration/oauthConfiguration';
import {LoginState} from '../login/loginState';

/*
 * Manage the local web server which listens on a loopback URL on the desktop user's PC
 */
export class LoopbackWebServer {

    // At any one time the server is either running on a single port or not running
    private static _server: Http.Server | null = null;
    private static _runtimePort = 0;

    // Instance fields
    private readonly _oauthConfig: OAuthConfiguration;
    private readonly _loginState: LoginState;

    public constructor(oauthConfig: OAuthConfiguration, loginState: LoginState) {
        this._oauthConfig = oauthConfig;
        this._loginState = loginState;
        this._setupCallbacks();
    }

    /*
     * Start the server if it is not started already, and return the port
     */
    public async start(): Promise<number> {

        if (!LoopbackWebServer._server) {
            await this._startServer();
        }

        return LoopbackWebServer._runtimePort;
    }

    /*
     * Handle starting the server the first time
     */
    private async _startServer(): Promise<void> {

        // Get a port to listen on
        LoopbackWebServer._runtimePort = await this._getRuntimeLoopbackPort();

        // Create the server to receive the login response
        LoopbackWebServer._server = Http.createServer(this._handleBrowserRequest);

        // Start listening for requests
        LoopbackWebServer._server.listen(LoopbackWebServer._runtimePort);
    }

    /*
     * Get a runtime free port to listen on and form the loopback URL that will receive the response
     * Note that we use ports above 1024 which work for low privilege users
     */
    private async _getRuntimeLoopbackPort(): Promise<number> {

        // Adapt the 2 argument callback into a promise so that it fits with async / await
        return new Promise<number>((resolve, reject) => {

            const finderCallback = (err: any, freePort: number) => {

                if (err) {
                    return reject(err);
                }

                return resolve(freePort);
            };

            FindFreePort(
                this._oauthConfig.loopbackMinPort,
                this._oauthConfig.loopbackMaxPort,
                'localhost',
                1,
                finderCallback,
            );
        });
    }

    /*
     * Handle an incoming request from the browser running at a URL such as http://localhost:8001
     */
    private _handleBrowserRequest(request: Http.IncomingMessage, response: Http.ServerResponse): void {

        if (!request.url) {
            return;
        }

        // First get query params
        const parsedUrl = this._tryParseUrl(request.url);
        if (!parsedUrl) {
            return;
        }

        // Ask the state object to handle the response based on the state parameter returned
        this._loginState.handleLoginResponse(parsedUrl.query);

        // Calculate the post login location, and forward errors if required
        let postLoginUrl = this._oauthConfig.postLoginPage;
        if (parsedUrl.query.error) {
            postLoginUrl += `?error=${parsedUrl.query.error}`;
        }

        // Redirect to the post login location
        response.writeHead(301, {
            Location: postLoginUrl,
        });
        response.end();

        // Stop the web server now that the login attempt has finished
        LoopbackWebServer._server!.close();
        LoopbackWebServer._server = null;
        LoopbackWebServer._runtimePort = 0;
    }

    /*
     * Private URI scheme notifications could provide malformed input, so parse them safely
     */
    private _tryParseUrl(url: string): Url.UrlWithParsedQuery | null {

        try {
            return Url.parse(url, true);
        } catch (e) {
            return null;
        }
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks() {
        this._handleBrowserRequest = this._handleBrowserRequest.bind(this);
    }
}
