import mustache from 'mustache';
import {ErrorCodes} from '../../shared/errors/errorCodes';
import {ErrorFactory} from '../../shared/errors/errorFactory';
import {UIError} from '../../shared/errors/uiError';
import {ErrorFormatter} from '../errors/errorFormatter';
import {ErrorLine} from '../errors/errorLine';
import {DomUtils} from './domUtils';
import {LoginNavigation} from './loginNavigation';

/*
 * The error view renders error details
 */
export class ErrorView {

    /*
     * Do the initial render
     */
    public load(): void {

        DomUtils.createDiv('#root', 'errorcontainer');
        const html =
            `<div class='card border-0'>
                <div class='row'>
                    <div id='errortitle' class='col-10 errorcolor largetext fw-bold text-center'>
                    </div>
                    <div class='col-2 text-end'>
                        <button id='btnClearError' type='button'>x</button>
                    </div>
                </div>
                <div class='row card-body'>
                    <div id='errorform' class='col-12'>
                    </div>
                </div>
            </div>`;

        DomUtils.html('#errorcontainer', html);
        DomUtils.hide('#errorcontainer');
        DomUtils.onClick('#btnClearError', this.clear);
    }

    /*
     * Do the error rendering given an exception
     */
    public report(exception: any): void {

        // Get the error into an object
        const error = ErrorFactory.fromException(exception);
        if (error.errorCode === ErrorCodes.loginRequired) {

            // Login required errors are not real exceptions, and we will instead move to the login required page
            LoginNavigation.navigateToLoginRequired();

        } else if (error.errorCode === ErrorCodes.loginCancelled) {

            // The frontend ignores this error code and maintains its current state

        } else {

            // Otherwise render the error details
            this._renderError(error);
        }
    }

    /*
     * Clear content and hide error details
     */
    public clear(): void {
        DomUtils.text('#errortitle', '');
        DomUtils.text('#errorform', '');
        DomUtils.hide('#errorcontainer');
    }

    /*
     * Render the error to the UI
     */
    private _renderError(error: UIError): void {

        // Clear content and make the form visible
        DomUtils.text('#errortitle', '');
        DomUtils.text('#errorform', '');
        DomUtils.show('#errorcontainer');

        // Render the title
        DomUtils.text('#errortitle', 'Problem Encountered');

        // Render the error fields
        const formatter = new ErrorFormatter();
        const errorHtml =
            this._getLinesHtml(formatter.getErrorLines(error)) +
            this._getStackHtml(formatter.getErrorStack(error));
        DomUtils.html('#errorform', errorHtml);
    }

    /*
     * Get the HTML for the error lines
     */
    private _getLinesHtml(errorLines: ErrorLine[]): string {

        const htmlTemplate =
            `{{#lines}}
                <div class='row'>
                    <div class='col-4'>
                        {{label}}
                    </div>
                    <div class='col-8 valuecolor fw-bold'>
                        {{value}}
                    </div>
                </div>
            {{/lines}}`;

        return mustache.render(htmlTemplate, {lines: errorLines});
    }

    /*
     * Get the HTML for the error stack trace
     */
    private _getStackHtml(stackLine: ErrorLine | null): string {

        if (!stackLine) {
            return '';
        }

        const htmlTemplate =
            `<div class='row' />
                <div class='col-4'>
                    &nbsp;
                </div>
                <div class='col-8'>
                    &nbsp;
                </div>
            </div>
            <div class='row' />
                 <div class='col-4'>
                     {{label}}
                 </div>
                 <div class='col-8 small'>
                     {{value}}
                 </div>
             </div>`;

        return mustache.render(htmlTemplate, stackLine);
    }
}
