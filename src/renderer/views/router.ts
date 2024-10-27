import {ApiClient} from '../api/apiClient';
import {CompaniesView} from './companiesView';
import {DomUtils} from './domUtils';
import {LoginRequiredView} from './loginRequiredView';
import {TransactionsView} from './transactionsView';

/*
 * A very primitive router to deal with switching the main view
 */
export class Router {

    private readonly apiClient: ApiClient;
    private readonly loginRequiredView: LoginRequiredView;

    public constructor(apiClient: ApiClient) {
        this.apiClient = apiClient;
        this.loginRequiredView = new LoginRequiredView();
    }

    /*
     * Execute a view based on the hash URL data
     */
    public async loadView(): Promise<void> {

        DomUtils.createDiv('#root', 'main');
        if (this.isInLoginRequiredView()) {

            // If the user needs to sign in then render the login required view
            await this.loginRequiredView.load();

        } else {

            // The transactions view has a URL such as #company=2
            const transactionsCompany = this.getTransactionsViewId();
            if (transactionsCompany) {

                // If there is an id we move to the transactions view
                const view = new TransactionsView(this.apiClient, transactionsCompany);
                await view.load();

            } else {

                // Otherwise we show the companies list view
                const view = new CompaniesView(this.apiClient);
                await view.load();
            }
        }
    }

    /*
     * Ask the router to start the login operation
     */
    public getLoginRequiredView(): LoginRequiredView {
        return this.loginRequiredView;
    }

    /*
     * Return true if we are in the home view
     */
    public isInHomeView(): boolean {
        return !this.getTransactionsViewId() && !this.isInLoginRequiredView();
    }

    /*
     * The transactions view has a URL such as #company=2
     */
    public getTransactionsViewId(): string {

        const args = this.getLocationHashData();
        if (args) {
            return args.get('company') || '';
        }

        return '';
    }

    /*
     * The logged out view has some special logic related to not showing user info
     */
    public isInLoginRequiredView(): boolean {
        return location.hash.indexOf('loggedout') !== -1;
    }

    /*
     * Get hash fragments into a dictionary
     */
    private getLocationHashData(): URLSearchParams | null {

        if (location.hash.startsWith('#')) {
            return new URLSearchParams(location.hash.substring(1));
        }

        return null;
    }
}
