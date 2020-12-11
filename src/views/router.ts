import urlparse from 'url-parse';
import {ApiClient} from '../api/client/apiClient';
import {Authenticator} from '../plumbing/oauth/authenticator';
import {CompaniesView} from './companiesView';
import {ErrorView} from './errorView';
import {LoginRequiredView} from './loginRequiredView';
import {TransactionsView} from './transactionsView';

/*
 * A very primitive router to deal with switching the main view
 */
export class Router {

    private readonly _apiClient: ApiClient;
    private readonly _authenticator: Authenticator;
    private readonly _errorView: ErrorView;
    private readonly _postLoginAction: () => void;

    public constructor(
        apiClient: ApiClient,
        authenticator: Authenticator,
        errorView: ErrorView,
        postLoginAction: () => void) {

        this._apiClient = apiClient;
        this._authenticator = authenticator;
        this._errorView = errorView;
        this._postLoginAction = postLoginAction;
    }

    /*
     * Execute a view based on the hash URL data
     */
    public async loadView(): Promise<void> {

        // Clear errors from the previous view
        this._errorView.clear();

        // Our simplistic routing works out which main view to show from a couple of known hash fragments
        if (location.hash.indexOf('loginrequired') !== -1) {

            // If the user needs to sign in then run the login required view
            const view = new LoginRequiredView(this._authenticator, this._errorView, this._postLoginAction);
            await view.load();

        } else {

            // Do simple routing based on hash parameters
            const hashData = this._getLocationHashData();
            if (hashData.company) {

                // If there is an id we move to the transactions view
                const view = new TransactionsView(this._apiClient, hashData.company);
                await view.load();

            } else {

                // Otherwise we show the companies list view
                const view = new CompaniesView(this._apiClient);
                await view.load();
            }
        }
    }

    /*
     * Get hash fragments into a dictionary
     */
    private _getLocationHashData(): any {

        if (location.hash.startsWith('#')) {
            const data = urlparse('?' + location.hash.substring(1), true);
            if (data && data.query)  {
                return data.query;
            }
        }

        return {};
    }
}
