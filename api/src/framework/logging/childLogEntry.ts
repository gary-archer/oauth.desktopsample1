import {IDisposable} from '../utilities/idisposable';
import {LogEntry} from './logEntry';

/*
 * A helper to support the dispose pattern for child operations
 */
export class ChildLogEntry implements IDisposable {

    private readonly _logEntry: LogEntry;

    public constructor(logEntry: LogEntry) {
        this._logEntry = logEntry;
    }

    public dispose(): void {
        this._logEntry.endChildOperation();
    }
}
