import {DomUtils} from './domUtils';

/*
 * The login required view enables us to retry the login if the system browser tab is cancelled
 */
export class LoginRequiredView {

    /*
     * Render a basic message with hidden green progress text
     */
    public async load(): Promise<void> {

        const html =
            `<div>
                <div class='text-lg text-center'>
                    <h5>
                        You are signed out - sign in to access the app ...
                    </h5>
                    <p id='signingin' class='text-lg text-center text-green-700 hidden'>
                        Please enter your credentials in the browser and you will then be returned to the app ...
                    </p>
                </div>
            </div>`;
        DomUtils.html('#main', html);
    }

    /*
     * Show the green progress text
     */
    public showProgress(): void {
        DomUtils.show('#signingin');
    }

    /*
     * Hide the green progress text
     */
    public hideProgress(): void {
        DomUtils.hide('#signingin');
    }
}
