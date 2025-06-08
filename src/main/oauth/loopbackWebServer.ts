
import getPort, {clearLockedPorts, portNumbers} from 'get-port';
import Http from 'http';
import {EventEmitter} from 'node:events';
import {OAuthConfiguration} from '../configuration/oauthConfiguration';

/*
 * Manage the local web server which listens on a loopback URL on the desktop user's PC
 */
export class LoopbackWebServer {

    // At any one time the server is either running on a single port or not running
    private static server: Http.Server | null = null;
    private static runtimePort = 0;

    // Instance fields
    private readonly configuration: OAuthConfiguration;
    private readonly eventEmitter: EventEmitter;

    public constructor(oauthConfig: OAuthConfiguration, eventEmitter: EventEmitter) {
        this.configuration = oauthConfig;
        this.eventEmitter = eventEmitter;
        this.setupCallbacks();
    }

    /*
     * Start the server if it is not started already, and return the port
     */
    public async start(): Promise<number> {

        if (!LoopbackWebServer.server) {
            await this.startServer();
        }

        return LoopbackWebServer.runtimePort;
    }

    /*
     * Handle starting the server the first time
     */
    private async startServer(): Promise<void> {

        // Get a port to listen on
        const options = {
            port: portNumbers(this.configuration.loopbackMinPort, this.configuration.loopbackMaxPort),
            host: this.configuration.loopbackHostname,
        };
        LoopbackWebServer.runtimePort = await getPort(options);

        // Create the server to receive the login response
        LoopbackWebServer.server = Http.createServer(this.handleBrowserRequest);

        // Start listening for requests
        LoopbackWebServer.server.listen(LoopbackWebServer.runtimePort, this.configuration.loopbackHostname);
    }

    /*
     * Handle an incoming request from the browser running at a URL such as http://127.0.0.1:8001
     */
    private handleBrowserRequest(request: Http.IncomingMessage, response: Http.ServerResponse): void {

        const url = this.tryParseUrl(request);
        if (!url) {
            response.end();
            return;
        }

        const args = new URLSearchParams(url.search);
        if (!args.get('state')) {
            response.end();
            return;
        }

        // Notify the request handler to return the response
        this.eventEmitter.emit('LOGIN_COMPLETE', args);

        // Redirect to the post login location
        response.writeHead(301, {
            Location: this.configuration.postLoginPage,
        });
        response.end();

        // Stop the web server now that the login attempt has finished
        LoopbackWebServer.server?.close();
        LoopbackWebServer.server = null;
        LoopbackWebServer.runtimePort = 0;
        clearLockedPorts();
    }

    /*
     * External notifications could provide malformed input, so parse them safely
     */
    private tryParseUrl(request: Http.IncomingMessage): URL | null {

        try {
            return new URL(request.url || '', `http://${request.headers.host}`);
        } catch {
            return null;
        }
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private setupCallbacks() {
        this.handleBrowserRequest = this.handleBrowserRequest.bind(this);
    }
}
