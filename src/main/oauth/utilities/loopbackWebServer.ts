
import getPort, {portNumbers} from 'get-port';
import Http from 'http';
import {OAuthConfiguration} from '../../configuration/oauthConfiguration';
import {LoginState} from '../login/loginState';

/*
 * Manage the local web server which listens on a loopback URL on the desktop user's PC
 */
export class LoopbackWebServer {

    // At any one time the server is either running on a single port or not running
    private static _server: Http.Server | null = null;
    private static _runtimePort = 0;

    // Instance fields
    private readonly _configuration: OAuthConfiguration;
    private readonly _loginState: LoginState;

    public constructor(oauthConfig: OAuthConfiguration, loginState: LoginState) {
        this._configuration = oauthConfig;
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
        const options = {
            port: portNumbers(this._configuration.loopbackMinPort, this._configuration.loopbackMaxPort),
            host: this._configuration.loopbackHostname,
        };
        LoopbackWebServer._runtimePort = await getPort(options);

        // Create the server to receive the login response
        LoopbackWebServer._server = Http.createServer(this._handleBrowserRequest);

        // Start listening for requests
        LoopbackWebServer._server.listen(LoopbackWebServer._runtimePort);
    }

    /*
     * Handle an incoming request from the browser running at a URL such as http://127.0.0.1:8001
     */
    private _handleBrowserRequest(request: Http.IncomingMessage, response: Http.ServerResponse): void {

        const url = this._tryParseUrl(request);
        if (!url) {
            response.end();
            return;
        }

        const args = new URLSearchParams(url.search);
        if (!args.get('state')) {
            response.end();
            return;
        }

        // Ask the state object to handle the response based on the state parameter returned
        this._loginState.handleLoginResponse(args);

        // Calculate the post login location, and forward errors if required
        let postLoginUrl = this._configuration.postLoginPage;
        const error = args.get('error');
        if (error) {
            postLoginUrl += `?error=${error}`;
        }

        // Redirect to the post login location
        response.writeHead(301, {
            Location: postLoginUrl,
        });
        response.end();

        // Stop the web server now that the login attempt has finished
        LoopbackWebServer._server?.close();
        LoopbackWebServer._server = null;
        LoopbackWebServer._runtimePort = 0;
    }

    /*
     * External notifications could provide malformed input, so parse them safely
     */
    private _tryParseUrl(request: Http.IncomingMessage): URL | null {

        try {
            return new URL(request.url || '', `http://${request.headers.host}`);
        } catch {
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
