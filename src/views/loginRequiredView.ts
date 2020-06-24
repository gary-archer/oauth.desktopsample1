import $ from 'jquery';
import {ApplicationEventNames} from '../plumbing/events/applicationEventNames';
import {ApplicationEvents} from '../plumbing/events/applicationEvents';
import {Authenticator} from '../plumbing/oauth/authenticator';
import {ErrorView} from './errorView';

/*
 * The login required view is invoked when the user needs to login
 * It enables us to retry the login if the system browser tab is cancelled
 */
export class LoginRequiredView {

    // Login related input
    private readonly _authenticator: Authenticator;
    private readonly _errorView: ErrorView;
    private readonly _postLoginAction: () => void;

    /*
     * This view is constructed when there is no token yet or the user logs out
     */
    public constructor(
        authenticator: Authenticator,
        errorView: ErrorView,
        postLoginAction: () => void) {

        // Initialise state
        this._authenticator = authenticator;
        this._errorView = errorView;
        this._postLoginAction = postLoginAction;
        this._setupCallbacks();

        // Subscribe to the start login event
        ApplicationEvents.subscribe(ApplicationEventNames.ON_LOGIN, this._onLoginStart);
    }

    /*
     * Adjust UI elements when the view loads
     */
    public async load(): Promise<void> {

        // Render the HTML
        const html =
        `<div class='row'>
            <div class='col-12 text-center mx-auto loginrequired'>
                <h5>
                    You are logged out - click HOME to sign in ...
                </h5>
                <p id='signingin' class='initiallyhidden signingincolor'>
                    Sign In has started. If required, please switch to your browser and enter your credentials ...
                </p>
            </div>
        </div>`;
        $('#main').html(html);
    }

    /*
     * This fires when the Home button is clicked and the event is received
     */
    private async _onLoginStart(): Promise<void> {

        try {

            // Update the UI
            $('#signingin').show();

            // Start the login
            await this._authenticator.login();

            // Call the completion action on success
            this._postLoginAction();
            ApplicationEvents.unsubscribe(ApplicationEventNames.ON_LOGIN, this._onLoginStart);

        } catch (e) {

            // Report errors such as looking up metadata
            $('#signingin').hide();
            this._errorView.report(e);
        }
    }

    /*
     * Plumbing to ensure that the this parameter is available in async event handlers
     */
    private _setupCallbacks(): void {
        this._onLoginStart = this._onLoginStart.bind(this);
    }
}
