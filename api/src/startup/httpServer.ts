import * as cors from 'cors';
import {Application, Request, Response} from 'express';
import * as fs from 'fs';
import * as https from 'https';
import {Container} from 'inversify';
import {InversifyExpressServer, TYPE} from 'inversify-express-utils';
import * as path from 'path';
import * as url from 'url';
import {Configuration} from '../configuration/configuration';
import {CompositionRoot} from '../dependencies/compositionRoot';
import {FrameworkInitialiser, ILoggerFactory} from '../framework';
import {BasicApiClaimsProvider} from '../logic/authorization/basicApiClaimsProvider';
import {BasicApiClaims} from '../logic/entities/basicApiClaims';

/*
 * The relative path to web files
 */
const WEB_FILES_ROOT = '../../..';

/*
 * Configure HTTP behaviour at application startup
 */
export class HttpServer {

    /*
     * Our dependencies
     */
    private readonly _configuration: Configuration;
    private readonly _container: Container;
    private readonly _loggerFactory: ILoggerFactory;

    /*
     * Receive the configuration and the container
     */
    public constructor(apiConfig: Configuration, container: Container, loggerFactory: ILoggerFactory) {
        this._configuration = apiConfig;
        this._container = container;
        this._loggerFactory = loggerFactory;
    }

    /*
     * Configure behaviour before starting the server
     */
    public async configure(): Promise<Application> {

        // Create the server, which will use registered @controller attributes to set up Express routes
        // Note that we do not use the final parameter as an auth provider due to dependency injection limitations
        const server = new InversifyExpressServer(
            this._container,
            null,
            {rootPath: '/api'},
            null,
            null);

        // Create a framework initialiser
        const framework = new FrameworkInitialiser<BasicApiClaims>(
            this._container,
            this._configuration.framework,
            this._loggerFactory);

        // Prepare the framework which will register its dependencies
        // Use supplier functions for the concrete claims type, to work around TypeScript generic type erasure
        await framework.withApiBasePath('/api/')
                       .withClaimsSupplier(BasicApiClaims)
                       .withCustomClaimsProviderSupplier(BasicApiClaimsProvider)
                       .prepare();

        // Next register the API's business logic dependencies
        CompositionRoot.registerDependencies(this._container);

        // Configure middleware
        server.setConfig((expressApp: Application) => {

            // Our API requests are not designed for caching
            expressApp.set('etag', false);

            // Allow cross origin requests from the SPA
            const corsOptions = { origin: this._configuration.api.trustedOrigins };
            expressApp.use('/api/*', cors(corsOptions));

            // Configure how static content for login pages is served
            this._configureLoginStaticContent(expressApp);

            // Configure framework cross cutting concerns for security and logging
            framework.configureMiddleware(expressApp);
        });

        // Configure framework error handling last
        server.setErrorConfig((expressApp: Application) => {
            framework.configureExceptionHandler(expressApp);
        });

        // Build and return the express app
        return server.build();
    }

    /*
     * Start listening for requests
     */
    public start(expressApp: Application): void {

        // Use the web URL to determine the port
        const webUrl = url.parse(this._configuration.api.trustedOrigins[0]);

        // Calculate the port from the URL
        let port = 443;
        if (webUrl.port) {
            port = Number(webUrl.port);
        }

        // Node does not support certificate stores so we need to load a certificate file from disk
        const sslOptions = {
            pfx: fs.readFileSync(`certs/${this._configuration.api.sslCertificateFileName}`),
            passphrase: this._configuration.api.sslCertificatePassword,
        };

        // Start listening on HTTPS
        const httpsServer = https.createServer(sslOptions, expressApp);
        httpsServer.listen(port, () => {

            // Show a startup message
            const logger = this._loggerFactory.getStartupMessageLogger('HTTP Server');
            logger.info(`Listening on HTTPS port ${port}`);
        });
    }

    /*
     * Handle requests for static web content served from our loopback login server
     */
    private _configureLoginStaticContent(expressApp: Application): void {
        expressApp.get('/web/*', this._getWebResource);
        expressApp.get('/favicon.ico', this._getFavicon);
    }

    /*
     * Serve up the requested web file to render in the desktop's loopback web server
     */
    private _getWebResource(request: Request, response: Response): void {
        const resourcePath = request.path.replace('web/', '');
        const webFilePath = path.join(`${__dirname}/${WEB_FILES_ROOT}/web/${resourcePath}`);
        response.sendFile(webFilePath);
    }

    /*
     * Serve up our favicon to render in the desktop's loopback web server
     */
    private _getFavicon(request: Request, response: Response): void {
        const webFilePath = path.join(`${__dirname}/${WEB_FILES_ROOT}/web/favicon.ico`);
        response.sendFile(webFilePath);
    }
}
