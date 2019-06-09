import {NextFunction, Request, Response} from 'express';
import {FrameworkConfiguration} from '../configuration/frameworkConfiguration';
import {LogEntry} from '../logging/logEntry';
import {HttpContextAccessor} from '../utilities/httpContextAccessor';
import {ResponseWriter} from '../utilities/responseWriter';
import {ApiError} from './apiError';
import {ExceptionHelper} from './exceptionHelper';

/*
 * The entry point for catching exceptions during API calls
 */
export class UnhandledExceptionHandler {

    private readonly _configuration: FrameworkConfiguration;
    private readonly _contextAccessor: HttpContextAccessor;

    /*
     * Receive dependencies
     */
    public constructor(configuration: FrameworkConfiguration, contextAccessor: HttpContextAccessor) {

        this._configuration = configuration;
        this._contextAccessor = contextAccessor;
        this._setupCallbacks();
    }

    /*
     * Process any exceptions from controllers
     */
    public handleException(exception: any, request: Request, response: Response, next: NextFunction): void {

        // Get the log entry for this API request
        const httpContext = this._contextAccessor.getHttpContext(request);
        const logEntry = LogEntry.getCurrent(httpContext);

        // Get the error into a known object
        const error = ExceptionHelper.fromException(exception, this._configuration.apiName);

        // Add the error to the log entry, which will be logged by the logging middleware later
        logEntry.setError(error);

        // Get the error to return to the client
        const clientError = (error instanceof ApiError) ? error.toClientError() : error;

        // Write the client response
        const writer = new ResponseWriter();
        writer.writeObjectResponse(response, clientError.getStatusCode(), clientError.toResponseFormat());
    }

    /*
     * Plumbing to ensure the this parameter is available
     */
    private _setupCallbacks(): void {
        this.handleException = this.handleException.bind(this);
    }
}
