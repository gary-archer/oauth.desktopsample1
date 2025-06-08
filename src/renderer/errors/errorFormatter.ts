import {UIError} from '../../shared/errors/uiError';
import {ErrorLine} from './errorLine';

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

        if (error.getArea().length > 0) {
            lines.push(this.createErrorLine('Area', error.getArea()));
        }

        if (error.getErrorCode().length > 0) {
            lines.push(this.createErrorLine('Error Code', error.getErrorCode()));
        }

        if (error.getStatusCode() > 0) {
            lines.push(this.createErrorLine('Status Code', error.getStatusCode().toString()));
        }

        if (error.getInstanceId() > 0) {
            lines.push(this.createErrorLine('Id', error.getInstanceId().toString()));
        }

        if (error.getUtcTime().length > 0) {

            const errorTime = Date.parse(error.getUtcTime());
            const displayTime = new Date(errorTime).toLocaleString('en', {
                timeZone: 'utc',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            }).replace(/,/g, '');
            lines.push(this.createErrorLine('UTC Time', displayTime));
        }

        if (error.getDetails().length > 0) {
            lines.push(this.createErrorLine('Details', error.getDetails()));
        }

        if (error.getUrl().length > 0) {
            lines.push(this.createErrorLine('URL', error.getUrl()));
        }

        return lines;
    }

    /*
     * Return the stack separately, since it is rendered in smaller text
     */
    public getErrorStack(error: UIError): ErrorLine | null {

        // Render the stack trace as a long string that can be decompiled at https://sourcemaps.info
        if (error.stack) {
            return this.createErrorLine('Stack', error.stack);
        }

        return null;
    }

    /*
     * Return an error line as an object
     */
    private createErrorLine(label: string, value: string): ErrorLine {

        return {
            label,
            value,
        };
    }
}
