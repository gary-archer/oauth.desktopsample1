import {Application} from 'express';
import {Container} from 'inversify';
import {FrameworkConfiguration} from '../configuration/frameworkConfiguration';
import {UnhandledExceptionHandler} from '../errors/unhandledExceptionHandler';
import {UnhandledPromiseRejectionHandler} from '../errors/unhandledPromiseRejectionHandler';
import {ICustomClaimsProvider} from '../extensibility/icustomClaimsProvider';
import {ILogEntry} from '../logging/ilogEntry';
import {ILoggerFactory} from '../logging/iloggerFactory';
import {LoggerFactory} from '../logging/loggerFactory';
import {LoggerMiddleware} from '../logging/loggerMiddleware';
import {AuthenticationFilter} from '../security/authenticationFilter';
import {Authenticator} from '../security/authenticator';
import {ClaimsCache} from '../security/claimsCache';
import {ClaimsMiddleware} from '../security/claimsMiddleware';
import {ClaimsSupplier} from '../security/claimsSupplier';
import {CoreApiClaims} from '../security/coreApiClaims';
import {HeaderAuthenticator} from '../security/headerAuthenticator';
import {IAuthenticator} from '../security/iauthenticator';
import {IssuerMetadata} from '../security/issuerMetadata';
import {CustomHeaderMiddleware} from '../utilities/customHeaderMiddleware';
import {HttpContextAccessor} from '../utilities/httpContextAccessor';
import {FRAMEWORKTYPES} from './frameworkTypes';

/*
 * A builder style class to configure framework behaviour and to register its dependencies
 */
export class FrameworkInitialiser<TClaims extends CoreApiClaims> {

    // Injected properties
    private readonly _container: Container;
    private readonly _configuration: FrameworkConfiguration;
    private readonly _loggerFactory: ILoggerFactory;

    // Properties set via builder methods
    private _apiBasePath: string;
    private _useOAuthAuthentication: boolean;
    private _unsecuredPaths: string[];
    private _claimsSupplier!: () => TClaims;
    private _customClaimsProviderSupplier!: () => ICustomClaimsProvider<TClaims>;

    // Calculated properties
    private _httpContextAccessor!: HttpContextAccessor;
    private _exceptionHandler!: UnhandledExceptionHandler;
    private _unhandledPromiseRejectionHandler!: UnhandledPromiseRejectionHandler;

    /*
     * Receive base details
     */
    public constructor(
        container: Container,
        configuration: FrameworkConfiguration,
        loggerFactory: ILoggerFactory) {

        this._container = container;
        this._configuration = configuration;
        this._loggerFactory = loggerFactory;
        this._apiBasePath = '/';
        this._useOAuthAuthentication = true;
        this._unsecuredPaths = [];
    }

    /*
     * Set the API base path, such as /api/
     */
    public withApiBasePath(apiBasePath: string): FrameworkInitialiser<TClaims> {

        this._apiBasePath = apiBasePath.toLowerCase();
        if (!apiBasePath.endsWith('/')) {
            apiBasePath += '/';
        }

        return this;
    }

    /*
     * Configure any API paths that return unsecured content, such as /api/unsecured
     */
    public addUnsecuredPath(unsecuredPath: string): FrameworkInitialiser<TClaims> {
        this._unsecuredPaths.push(unsecuredPath.toLowerCase());
        return this;
    }

    /*
     * Private APIs call this to get OAuth values from headers
     */
    public useHeaderAuthentication(): FrameworkInitialiser<TClaims> {
        this._useOAuthAuthentication = false;
        return this;
    }

    /*
     * Consumers of the builder class must provide a constructor function for creating claims
     */
    public withClaimsSupplier(construct: new () => TClaims): FrameworkInitialiser<TClaims> {
        this._claimsSupplier = () => new construct();
        return this;
    }

    /*
     * Consumers of the builder class can provide a constructor function for injecting custom claims
     */
    public withCustomClaimsProviderSupplier(construct: new () => ICustomClaimsProvider<TClaims>)
            : FrameworkInitialiser<TClaims> {

        this._customClaimsProviderSupplier = () => new construct();
        return this;
    }

    /*
     * Prepare the framework
     */
    public async prepare(): Promise<FrameworkInitialiser<TClaims>> {

        // Create an object to access the child container per request via the HTTP context
        this._httpContextAccessor = new HttpContextAccessor();

        // Create the unhandled exception handler for API requests
        this._exceptionHandler = new UnhandledExceptionHandler(this._configuration, this._httpContextAccessor);

        // Create an object to handle unpromised rejection exceptions in Express middleware
        this._unhandledPromiseRejectionHandler = new UnhandledPromiseRejectionHandler(this._exceptionHandler);

        // Load OAuth metadata
        const issuerMetadata = new IssuerMetadata(this._configuration);
        await issuerMetadata.load();

        // Create the cache used to store claims results after authentication processing
        // Use a constructor function as the first parameter, as required by TypeScript generics
        const claimsCache = ClaimsCache.createInstance<ClaimsCache<TClaims>>(
            ClaimsCache,
            this._configuration,
            this._loggerFactory);

        // Create an injectable object to enable the framework to create claims objects of a concrete type at runtime
        const claimsSupplier = ClaimsSupplier.createInstance<ClaimsSupplier<TClaims>, TClaims>(
            ClaimsSupplier,
            this._claimsSupplier,
            this._customClaimsProviderSupplier);

        // Register framework dependencies as part of preparing the framework
        this._registerDependencies(issuerMetadata, claimsCache, claimsSupplier);
        return this;
    }

    /*
     * Set up cross cutting concerns as Express middleware, passing in singleton objects
     */
    public configureMiddleware(expressApp: Application): FrameworkInitialiser<TClaims> {

        // The first middleware starts structured logging of API requests
        const logger = new LoggerMiddleware(this._httpContextAccessor, this._loggerFactory);
        expressApp.use(
            `${this._apiBasePath}*`,
            this._unhandledPromiseRejectionHandler.apply(logger.logRequest));

        // The second middleware manages authentication and claims
        const filter = new AuthenticationFilter<TClaims>(this._unsecuredPaths, this._httpContextAccessor);
        expressApp.use(
            `${this._apiBasePath}*`,
            this._unhandledPromiseRejectionHandler.apply(filter.authorizeAndGetClaims));

        // The third middleware provides non functional testing behaviour
        const handler = new CustomHeaderMiddleware(this._configuration.apiName);
        expressApp.use(
            `${this._apiBasePath}*`,
            this._unhandledPromiseRejectionHandler.apply(handler.processHeaders));

        return this;
    }

    /*
     * Express error middleware is configured last, to catch unhandled exceptions
     */
    public configureExceptionHandler(expressApp: Application): FrameworkInitialiser<TClaims> {

        expressApp.use(`${this._apiBasePath}*`, this._exceptionHandler.handleException);
        return this;
    }

    /*
     * Register dependencies when authentication is configured
     */
    private _registerDependencies(
        issuerMetadata: IssuerMetadata,
        claimsCache: ClaimsCache<TClaims>,
        claimsSupplier: ClaimsSupplier<TClaims>): void {

        /*** SINGLETONS ***/

        // Register logging objects
        this._container.bind<FrameworkConfiguration>(FRAMEWORKTYPES.Configuration)
                       .toConstantValue(this._configuration);
        this._container.bind<ILoggerFactory>(FRAMEWORKTYPES.LoggerFactory)
                        .toConstantValue(this._loggerFactory);

        // Register security objects
        this._container.bind<IssuerMetadata>(FRAMEWORKTYPES.IssuerMetadata)
                       .toConstantValue(issuerMetadata);
        this._container.bind<ClaimsCache<TClaims>>(FRAMEWORKTYPES.ClaimsCache)
                       .toConstantValue(claimsCache);
        this._container.bind<ClaimsSupplier<TClaims>>(FRAMEWORKTYPES.ClaimsSupplier)
                       .toConstantValue(claimsSupplier);

        /*** PER REQUEST OBJECTS ***/

        // Register the claims middleware
        this._container.bind<ClaimsMiddleware<TClaims>>(FRAMEWORKTYPES.ClaimsMiddleware)
                       .to(ClaimsMiddleware).inRequestScope();

        // Register the authenticator
        if (this._useOAuthAuthentication) {

            // Public APIs use OAuth authentication
            this._container.bind<IAuthenticator>(FRAMEWORKTYPES.Authenticator)
                       .to(Authenticator).inRequestScope();

        } else {

            // Private APIs use header authentication
            this._container.bind<IAuthenticator>(FRAMEWORKTYPES.Authenticator)
                       .to(HeaderAuthenticator).inRequestScope();
        }

        // Register dummy values that are overridden by middleware later
        this._container.bind<TClaims>(FRAMEWORKTYPES.ApiClaims)
                       .toConstantValue({} as any);

        // Register the log entry
        this._container.bind<ILogEntry>(FRAMEWORKTYPES.ILogEntry)
                       .toDynamicValue((ctx) =>
                            (this._loggerFactory as LoggerFactory).createLogEntry()).inRequestScope();
    }
}
