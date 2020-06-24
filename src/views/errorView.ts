import Handlebars from 'handlebars';
import $ from 'jquery';
import {ErrorCodes} from '../plumbing/errors/errorCodes';
import {ErrorFormatter} from '../plumbing/errors/errorFormatter';
import {ErrorHandler} from '../plumbing/errors/errorHandler';
import {UIError} from '../plumbing/errors/uiError';
import {LoginNavigation} from '../plumbing/oauth/login/loginNavigation';

/*
 * The error view renders error details
 */
export class ErrorView {

    public constructor() {
        this._setupCallbacks();
    }

    /*
     * Do the initial render
     */
    public load(): void {

        const html =
        `<div class='card border-0'>
            <div class='row'>
                <div class='col-2>
                </div>
                <div id='errortitle' class='col-8 errorcolor largetext font-weight-bold text-center'>
                </div>
                <div class='col-2 text-right'>
                    <button id='btnClearError' type='button'>x</button>
                </div>
            </div>
            <div class='row card-body'>
                <div id='errorform'  class='col-12'>
                </div>
            </div>
        </div>`;
        $('#errorcontainer').html(html);
        $('#errorcontainer').hide();

        // Set up click handlers
        $('#btnClearError').click(this.clear);
    }

    /*
     * Do the error rendering given an exception
     */
    public report(exception: any): void {

        // Get the error into an object
        const error = ErrorHandler.getFromException(exception) as UIError;

        // If a login is required, move to the login required page
        if (error.errorCode === ErrorCodes.loginRequired) {
            LoginNavigation.navigateToLoginRequired();
            return;
        }

        // Otherwise render the error fields
        this._renderError(error);
    }

    /*
     * Clear content and hide error details
     */
    public clear(): void {
        $('#errorform').html('');
        $('#errortitle').html('');
        $('#errorcontainer').hide();
    }

    /*
     * Render the error to the UI
     */
    private _renderError(error: UIError): void {

        // Clear content and make the form visible
        $('#errorform').html('');
        $('#errortitle').html('');
        $('#errorcontainer').show();

        // Get error details ready for display
        const formatter = new ErrorFormatter();
        const viewModel = {
            title: formatter.getErrorTitle(error),
            lines: formatter.getErrorLines(error),
        };

        // Render the title
        const titleTemplate = Handlebars.compile(`{{title}}`);
        const titleHtml = titleTemplate(viewModel);
        $('#errortitle').html(titleHtml);

        // Render the lines
        const htmlTemplate =
        `{{#each this}}
            <div class='row'>
                <div class='col-4'>
                    {{title}}
                </div>
                <div class='col-8 valuecolor font-weight-bold'>
                    {{value}}
                </div>
            </div>
        {{/each}}`;

        const linesTemplate = Handlebars.compile(htmlTemplate);
        const linesHtml = linesTemplate(viewModel.lines);
        $('#errorform').html(linesHtml);
    }

    /*
     * Plumbing to make the this parameter available in callbacks
     */
    private _setupCallbacks(): void {
        this.clear = this.clear.bind(this);
   }
}
