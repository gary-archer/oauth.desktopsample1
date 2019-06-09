import {ApiError} from '../errors/apiError';
import {IClientError} from '../extensibility/iclientError';
import {PerformanceBreakdown} from './performanceBreakdown';

/*
 * Each API request writes a structured log entry containing fields we will query by
 * It also writes JSON blobs whose fields are not designed to be queried
 */
export class LogEntryData {

    // The time when the API received the request
    public utcTime: Date;

    // The name of the API
    public apiName: string;

    // The operation called
    public operationName: string;

    // The host on which the request was processed
    public hostName: string;

    // The HTTP verb
    public requestVerb: string;

    // The request path
    public requestPath: string;

    // The application id of the original caller of the consumer API
    public clientId: string;

    // The calling application name
    public callingApplicationName: string;

    // The calling user, for secured requests
    public userId: string;

    // The calling user name, for secured requests
    public userName: string;

    // The status code returned
    public statusCode: number;

    // The time taken in API code
    public millisecondsTaken: number;

    // A time beyond which performance is considered 'slow'
    public performanceThresholdMilliseconds: number;

    // The error code for requests that failed
    public errorCode: string;

    // The specific error instance id, for 500 errors
    public errorId: number;

    // The correlation id, used to link related API requests together
    public correlationId: string;

    // A batch id, used in batch scenarios such as performance tests
    public batchId: string;

    // An object containing performance data, written when performance is slow
    public performance: PerformanceBreakdown;

    // An object containing error data, written for failed requests
    public errorData: ApiError | IClientError | null;

    // Can be populated in scenarios when extra text is useful
    public infoData: string[];

    /*
     * Give fields default values
     */
    public constructor() {

        // Queryable fields
        this.utcTime = new Date();
        this.apiName = '';
        this.operationName = '';
        this.hostName = '';
        this.requestVerb = '';
        this.requestPath = '';
        this.clientId = '';
        this.callingApplicationName = '';
        this.userId = '';
        this.userName = '';
        this.statusCode = 0;
        this.millisecondsTaken = 0;
        this.performanceThresholdMilliseconds = 0;
        this.errorCode = '';
        this.errorId = 0;
        this.correlationId = '';
        this.batchId = '';

        // Objects that are not directly queryable
        this.performance = new PerformanceBreakdown('total');
        this.errorData = null;
        this.infoData = [];
    }

    /*
     * Set fields from each other and manage denormalisation
     */
    public finalise(): void {

        // Denormalise error fields
        if (this.errorData) {
            const loggedError = this.errorData.toLogFormat();
            if (loggedError.clientError.code) {
                this.errorCode = loggedError.clientError.code;
            }
            if (loggedError.clientError.id) {
                this.errorId = loggedError.clientError.id;
            }
        }

        // Denormalise performance fields
        this.millisecondsTaken = this.performance.millisecondsTaken;
    }

    /*
     * For child items, this receives common properties from the parent
     */
    public updateFromParent(parent: LogEntryData) {

        // Set fixed fields from the parent
        this.apiName = parent.apiName;
        this.hostName = parent.hostName;
        this.requestVerb = parent.requestVerb;
        this.requestPath = parent.requestPath;
        this.clientId = parent.clientId;
        this.callingApplicationName = parent.callingApplicationName;
        this.userId = parent.userId;
        this.userName = parent.userName;
        this.correlationId = parent.correlationId;
        this.batchId = parent.batchId;
    }

    /*
     * This adjusts the parent data from a child
     */
    public updateFromChild(child: LogEntryData) {

        // Exclude the child's execution time from the parent
        this.performance.millisecondsTaken -= child.millisecondsTaken;
        this.millisecondsTaken -= child.millisecondsTaken;
    }

    /*
     * Produce the output format
     */
    public toLogFormat() {

        // Output fields used as top level queryable columns
        const output: any = {};
        this._outputString((x) => output.utcTime = x, this.utcTime.toISOString());
        this._outputString((x) => output.apiName = x, this.apiName);
        this._outputString((x) => output.operationName = x, this.operationName);
        this._outputString((x) => output.hostName = x, this.hostName);
        this._outputString((x) => output.requestVerb = x, this.requestVerb);
        this._outputString((x) => output.requestPath = x, this.requestPath);
        this._outputString((x) => output.clientId = x, this.clientId);
        this._outputString((x) => output.callingApplicationName = x, this.callingApplicationName);
        this._outputString((x) => output.userId = x, this.userId);
        this._outputString((x) => output.userName = x, this.userName);
        this._outputNumber((x) => output.statusCode = x, this.statusCode);
        this._outputString((x) => output.errorCode = x, this.errorCode);
        this._outputNumber((x) => output.errorId = x, this.errorId);
        this._outputNumber((x) => output.millisecondsTaken = x, this.performance.millisecondsTaken);
        this._outputNumber((x) => output.millisecondsThreshold = x, this.performanceThresholdMilliseconds, true);
        this._outputString((x) => output.correlationId = x, this.correlationId);
        this._outputString((x) => output.batchId = x, this.batchId);

        // Output object data, which is looked up via top level fields
        this._outputPerformance(output);
        this._outputError(output);
        this._outputInfo(output);
        return output;
    }

    /*
     * Indicate whether an error entry
     */
    public isError() {
        return this.errorData !== null;
    }

    /*
     * Add a string to the output unless empty
     */
    private _outputString(setter: (val: string) => void, value: string): void {
        if (value.length > 0) {
            setter(value);
        }
    }

    /*
     * Add a number to the output unless zero or forced
     */
    private _outputNumber(setter: (val: number) => void, value: number, force: boolean = false): void {
        if (value > 0 || force) {
            setter(value);
        }
    }

    /*
     * Add the performance breakdown if the threshold has been exceeded
     */
    private _outputPerformance(output: any): void {

        if (this.performance.millisecondsTaken >= this.performanceThresholdMilliseconds) {
            output.performance = this.performance.data;
        }
    }

    /*
     * Add error details if applicable
     */
    private _outputError(output: any): void {
        if (this.errorData !== null) {
            output.errorData = this.errorData.toLogFormat();
        }
    }

    /*
     * Add info details if applicable
     */
    private _outputInfo(data: any): void {
        if (this.infoData.length > 0) {
            data.infoData = this.infoData;
        }
    }
}
