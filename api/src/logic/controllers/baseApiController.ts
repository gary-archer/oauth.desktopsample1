import {BaseHttpController, interfaces} from 'inversify-express-utils';
import {FRAMEWORKTYPES, ILogEntry} from '../../framework';

/*
 * A base class to simplify logging the operation name, which Inversify Express does not expose
 * This is hacky but the least intrusive option I could find for Inversify Express
 */
export class BaseApiController extends BaseHttpController {

    /*
     * Expose the HTTP context to derived classes
     * https://github.com/Microsoft/TypeScript/issues/8512
     */
    protected getHttpContext(): interfaces.HttpContext {
        return this.httpContext;
    }

    /*
     * Get the current log entry and give it the calling method name
     */
    protected setOperationName(name: string): void {

        const logEntry = this.httpContext.container.get<ILogEntry>(FRAMEWORKTYPES.ILogEntry);
        logEntry.setOperationName(name);
    }
}
