import {ApiUserInfo} from '../../shared/api/apiUserInfo';
import {Company} from '../../shared/api/company';
import {CompanyTransactions} from '../../shared/api/companyTransactions';
import {OAuthUserInfo} from '../../shared/api/oauthUserInfo';
import {ErrorFactory} from '../../shared/errors/errorFactory';
import {IpcRendererEvents} from '../ipcRendererEvents';
import {AuthenticatorClient} from '../oauth/authenticatorClient';

/*
 * API operations from the renderer side of the app
 */
export class ApiClient {

    private readonly _ipcEvents: IpcRendererEvents;
    private readonly _authenticatorClient: AuthenticatorClient;

    public constructor(ipcEvents: IpcRendererEvents, authenticatorClient: AuthenticatorClient) {

        this._ipcEvents = ipcEvents;
        this._authenticatorClient = authenticatorClient;
    }

    /*
     * Get a list of companies
     */
    public async getCompanyList() : Promise<Company[]> {
        return await this._getDataFromApi(this._ipcEvents.getCompanyList);
    }

    /*
     * Get a list of transactions for a single company
     */
    public async getCompanyTransactions(id: string) : Promise<CompanyTransactions> {
        return await this._getDataFromApi(() => this._ipcEvents.getCompanyTransactions(id));
    }

    /*
     * Get user information from the authorization server
     */
    public async getOAuthUserInfo() : Promise<OAuthUserInfo> {
        return await this._getDataFromApi(() => this._ipcEvents.getOAuthUserInfo());
    }

    /*
     * Download user attributes the UI needs that are not stored in the authorization server
     */
    public async getApiUserInfo() : Promise<ApiUserInfo> {
        return await this._getDataFromApi(() => this._ipcEvents.getApiUserInfo());
    }

    /*
     * A parameterized method containing application specific logic for managing API calls
     */
    private async _getDataFromApi(callback: () => Promise<any>): Promise<any> {

        try {

            // Call the API and return data on success
            return await callback();

        } catch (e1: any) {

            // Report errors if this is not a 401
            const error1 = ErrorFactory.fromException(e1);
            if (error1.statusCode !== 401) {
                throw error1;
            }

            // Try to refresh the access token stored on the main side of the app
            await this._authenticatorClient.refreshAccessToken();

            // Call the API again with the new access token
            return await callback();
        }
    }
}
