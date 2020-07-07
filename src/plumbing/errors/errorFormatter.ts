import moment from 'moment';
import {ErrorLine} from './errorLine';
import {UIError} from './uiError';

/*
 * Format errors details ready for display
 */
export class ErrorFormatter {

    /*
     * Return a title for display
     */
    public getErrorTitle(error: UIError): string {
        return error.message;
    }

    /*
     * Get errors ready for display
     */
    public getErrorLines(error: UIError): ErrorLine[] {

        const lines: ErrorLine[] = [];

        if (error.area.length > 0) {
            lines.push(this._createErrorLine('Area', error.area));
        }

        if (error.errorCode.length > 0) {
            lines.push(this._createErrorLine('Error Code', error.errorCode));
        }

        if (error.statusCode > 0) {
            lines.push(this._createErrorLine('Status Code', error.statusCode.toString()));
        }

        if (error.instanceId > 0) {
            lines.push(this._createErrorLine('Id', error.instanceId.toString()));
        }

        if (error.utcTime.length > 0) {
            const displayTime = moment(error.utcTime).format('DD MMM YYYY HH:mm:ss');
            lines.push(this._createErrorLine('UTC Time', displayTime));
        }

        if (error.details.length > 0) {
            lines.push(this._createErrorLine('Details', error.details));
        }

        if (error.url.length > 0) {
            lines.push(this._createErrorLine('URL', error.url));
        }

        return lines;
    }

    /*
     * Return the stack separately, since it is rendered in smaller text
     */
    public getErrorStack(error: UIError): ErrorLine | null {

        // Render the stack trace as a long string that can be decompiled at https://sourcemaps.info
        if (error.stack) {
            return this._createErrorLine('Stack', error.stack);
        }

        return null;
    }

    /*
     * Return an error line as an object
     */
    private _createErrorLine(label: string, value: string): ErrorLine {

        return {
            label,
            value,
        };
    }
}
