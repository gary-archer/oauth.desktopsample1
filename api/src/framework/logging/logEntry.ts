import {Request, Response} from 'express';
import {Guid} from 'guid-typescript';
import {injectable} from 'inversify';
import {interfaces} from 'inversify-express-utils';
import * as os from 'os';
import {Logger} from 'winston';
import {FRAMEWORKTYPES} from '../configuration/frameworkTypes';
import {ApiError} from '../errors/apiError';
import {IClientError} from '../extensibility/iclientError';
import {CoreApiClaims} from '../security/coreApiClaims';
import {IDisposable} from '../utilities/idisposable';
import {ChildLogEntry} from './childLogEntry';
import {ILogEntry} from './ilogentry';
import {IPerformanceBreakdown} from './iperformanceBreakdown';
import {LogEntryData} from './logEntryData';
import {PerformanceThreshold} from './performanceThreshold';

/*
 * The full implementation class is private to the framework and excluded from the index.ts file
 */
@injectable()
export class LogEntry implements ILogEntry {

    /*
     * Return the current log entry's full implementation type to the framework
     */
    public static getCurrent(httpContext: interfaces.HttpContext): LogEntry {

        const found = httpContext.container.get<ILogEntry>(FRAMEWORKTYPES.ILogEntry);
        if (found && found instanceof LogEntry) {
            return found as LogEntry;
        }

        throw new Error('Unable to get the log entry from the HTTP context');
    }

    // Data logged
    private _data: LogEntryData;
    private _children: LogEntryData[];
    private _activeChild: LogEntryData | null;

    // Performance information
    private _defaultThresholdMilliseconds!: number;
    private _performanceThresholdOverrides!: PerformanceThreshold[];

    /*
     * A log entry is created once per API request
     */
    public constructor(apiName: string) {
        this._data = new LogEntryData();
        this._data.apiName = apiName;
        this._data.hostName = os.hostname();
        this._children = [];
        this._activeChild = null;
    }

    /*
     * Set default performance details after creation
     */
    public setPerformanceThresholds(defaultMilliseconds: number, overrides: PerformanceThreshold[]) {
        this._defaultThresholdMilliseconds = defaultMilliseconds;
        this._data.performanceThresholdMilliseconds = this._defaultThresholdMilliseconds;
        this._performanceThresholdOverrides = overrides;
    }

    /*
     * Start collecting data before calling the API's business logic
     */
    public start(request: Request): void {

        // Read request details
        this._data.performance.start();
        this._data.requestVerb = request.method;
        this._data.requestPath = request.originalUrl;

        // Our callers can supply a custom header so that we can keep track of who is calling each API
        const callingApplicationName = request.header('x-sample-api-client');
        if (callingApplicationName) {
            this._data.callingApplicationName = callingApplicationName;
        }

        // Use the correlation id from request headers or create one
        const correlationId = request.header('x-sample-correlation-id');
        if (correlationId) {
            this._data.correlationId = correlationId;
        } else {
            this._data.correlationId = Guid.create().toString();
        }

        // Log an optional batch id if supplied
        const batchId = request.header('x-sample-batch-id');
        if (batchId) {
            this._data.batchId = batchId;
        }
    }

    /*
     * Add identity details for secured requests
     */
    public setIdentity(claims: CoreApiClaims): void {
        this._data.clientId = claims.clientId;
        this._data.userId = claims.userId;
        this._data.userName = `${claims.givenName} ${claims.familyName}`;
    }

    /*
     * Business logic must set the operation name, since we cannot derive it generically
     */
    public setOperationName(name: string): void {
        this._data.operationName = name;
        this._data.performanceThresholdMilliseconds = this._getPerformanceThreshold(name);
    }

    /*
     * Create a child performance breakdown when requested
     */
    public createPerformanceBreakdown(name: string): IPerformanceBreakdown {
        const child = this._current().performance.createChild(name);
        child.start();
        return child;
    }

    /*
     * Add error details after they have been processed by the exception handler
     */
    public setError(error: ApiError | IClientError): void {
        this._current().errorData = error;
    }

    /*
     * Enable free text to be added to production logs, though this should be avoided in most cases
     */
    public addInfo(info: string): void {
        this._current().infoData.push(info);
    }

    /*
     * Start a child operation, which gets its own JSON log output
     */
    public startChildOperation(name: string): IDisposable {

        // Fail if used incorrectly
        if (this._activeChild) {
            throw new Error('The previous child operation must be completed before a new child can be started');
        }

        // Initialise the child
        this._activeChild = new LogEntryData();
        this._activeChild.performanceThresholdMilliseconds = this._getPerformanceThreshold(name);
        this._activeChild.operationName = name;
        this._activeChild.performance.start();

        // Add to the parent and return an object to simplify disposal
        this._children.push(this._activeChild);
        return new ChildLogEntry(this);
    }

    /*
     * Complete a child operation
     */
    public endChildOperation(): void {

        if (this._activeChild) {
            this._activeChild.performance.dispose();
            this._activeChild = null;
        }
    }

    /*
     * Finish collecting data at the end of the API request
     */
    public end(response: Response): void {

        // If an active child operation needs ending (due to exceptions) then we do it here
        this.endChildOperation();

        // Finish performance measurements
        this._data.performance.dispose();

        // Record response details
        this._data.statusCode = response.statusCode;

        // Do normal finalisation, such as setting denormalised fields
        this._data.finalise();

        // Finalise data related to child log entries, to copy data points between parent and children
        this._children.forEach((child) => {

            child.finalise();
            child.updateFromParent(this._data);
            this._data.updateFromChild(child);
        });
    }

    /*
     * Output any child data and then the parent data
     */
    public write(logger: Logger): void {

        this._children.forEach((child) => this._writeDataItem(child, logger));
        this._writeDataItem(this._data, logger);
    }

    /*
     * Get the data to use when a child operation needs to be managed
     */
    private _current(): LogEntryData {

        if (this._activeChild) {
            return this._activeChild;
        } else {
            return this._data;
        }
    }

    /*
     * Given an operation name, set its performance threshold
     */
    private _getPerformanceThreshold(name: string): number {

        const found = this._performanceThresholdOverrides.find((o) => o.name.toLowerCase() === name.toLowerCase());
        if (found) {
            return found.milliseconds;
        }

        return this._defaultThresholdMilliseconds;
    }

    /*
     * Write a single data item
     */
    private _writeDataItem(item: LogEntryData, logger: Logger): void {

        // Get the object to log
        const logData = item.toLogFormat();

        // Output it
        if (this._data.isError()) {
            logger.error(logData);
        } else {
            logger.info(logData);
        }
    }
}
