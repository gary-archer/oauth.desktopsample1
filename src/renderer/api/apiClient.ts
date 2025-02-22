import {ApiUserInfo} from '../../shared/api/apiUserInfo';
import {Company} from '../../shared/api/company';
import {CompanyTransactions} from '../../shared/api/companyTransactions';
import {OAuthUserInfo} from '../../shared/api/oauthUserInfo';
import {ErrorFactory} from '../../shared/errors/errorFactory';
import {IpcRendererEvents} from '../ipcRendererEvents';
import {OAuthClient} from '../oauth/oauthClient';

/*
 * API operations from the renderer side of the app
 */
export class ApiClient {

    private readonly ipcEvents: IpcRendererEvents;
    private readonly oauthClient: OAuthClient;

    public constructor(ipcEvents: IpcRendererEvents, oauthClient: OAuthClient) {

        this.ipcEvents = ipcEvents;
        this.oauthClient = oauthClient;
    }

    /*
     * Get a list of companies
     */
    public async getCompanyList() : Promise<Company[]> {
        return await this.getDataFromApi(this.ipcEvents.getCompanyList);
    }

    /*
     * Get a list of transactions for a single company
     */
    public async getCompanyTransactions(id: string) : Promise<CompanyTransactions> {
        return await this.getDataFromApi(() => this.ipcEvents.getCompanyTransactions(id));
    }

    /*
     * Get user information from the authorization server
     */
    public async getOAuthUserInfo() : Promise<OAuthUserInfo> {
        return await this.getDataFromApi(() => this.ipcEvents.getOAuthUserInfo());
    }

    /*
     * Download user attributes the UI needs that are not stored in the authorization server
     */
    public async getApiUserInfo() : Promise<ApiUserInfo> {
        return await this.getDataFromApi(() => this.ipcEvents.getApiUserInfo());
    }

    /*
     * A parameterized method containing application specific logic for managing API calls
     */
    private async getDataFromApi(callback: () => Promise<any>): Promise<any> {

        try {

            // Call the API and return data on success
            return await callback();

        } catch (e1: any) {

            // Report errors if this is not a 401
            const error1 = ErrorFactory.fromException(e1);
            if (error1.getStatusCode() !== 401) {
                throw error1;
            }

            // Try to refresh the access token stored on the main side of the app
            await this.oauthClient.refreshAccessToken();

            // Call the API again with the new access token
            return await callback();
        }
    }
}
