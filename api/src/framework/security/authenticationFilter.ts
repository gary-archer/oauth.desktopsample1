import {NextFunction, Request, Response} from 'express';
import {injectable} from 'inversify';
import {FRAMEWORKTYPES} from '../configuration/frameworkTypes';
import {LogEntry} from '../logging/logEntry';
import {HttpContextAccessor} from '../utilities/httpContextAccessor';
import {ClaimsMiddleware} from './claimsMiddleware';
import {CoreApiClaims} from './coreApiClaims';
import {CustomPrincipal} from './customPrincipal';

/*
 * The Express entry point for authentication processing
 */
@injectable()
export class AuthenticationFilter<TClaims extends CoreApiClaims> {

    // Injected dependencies
    private readonly _unsecuredPaths: string[];
    private readonly _contextAccessor: HttpContextAccessor;

    /*
     * Receive dependencies
     */
    public constructor(unsecuredPaths: string[], contextAccessor: HttpContextAccessor) {
        this._unsecuredPaths = unsecuredPaths;
        this._contextAccessor = contextAccessor;
        this._setupCallbacks();
    }

    /*
     * The entry point for implementing authorization
     */
    public async authorizeAndGetClaims(request: Request, response: Response, next: NextFunction): Promise<void> {

        if (this._isUnsecuredPath(request.originalUrl.toLowerCase())) {

            // Move to controller logic if this is an unsecured API operation
            next();

        } else {

            // Get the log entry for this API request
            const httpContext = this._contextAccessor.getHttpContext(request);
            const logEntry = LogEntry.getCurrent(httpContext);

            // Create the claims middleware for this request, then process the access token and get claims
            const middleware = httpContext.container.get<ClaimsMiddleware<TClaims>>(FRAMEWORKTYPES.ClaimsMiddleware);
            const claims = await middleware.authorizeRequestAndGetClaims(request);

            // Set the user against the HTTP context, as expected by inversify express
            httpContext.user = new CustomPrincipal(claims);

            // Log who called the API
            logEntry.setIdentity(claims);

            // Register the claims against this requests's child container
            // This enables the claims object to be injected into business logic classes
            httpContext.container.bind<TClaims>(FRAMEWORKTYPES.ApiClaims).toConstantValue(claims);

            // On success, move on to the controller logic
            next();
        }
    }

    /*
     * Return true if this request does not use security
     */
    private _isUnsecuredPath(path: string): boolean {
        const found = this._unsecuredPaths.find((p) => path.startsWith(p));
        return !!found;
    }

    /*
     * Plumbing to ensure the this parameter is available
     */
    private _setupCallbacks(): void {
        this.authorizeAndGetClaims = this.authorizeAndGetClaims.bind(this);
    }
}
