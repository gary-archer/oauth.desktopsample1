import axios, {Method} from 'axios';
import {ErrorFactory} from '../../plumbing/errors/errorFactory';
import {Authenticator} from '../../plumbing/oauth/authenticator';
import {ApiUserInfo} from '../entities/apiUserInfo';
import {Company} from '../entities/company';
import {CompanyTransactions} from '../entities/companyTransactions';
import {Configuration} from '../../configuration/configuration';
import {OAuthUserInfo} from '../../plumbing/oauth/oauthUserInfo';
import {AxiosUtils} from '../../plumbing/utilities/axiosUtils';

/*
 * Logic related to making API calls
 */
export class ApiClient {

    private readonly _configuration: Configuration;
    private readonly _authenticator: Authenticator;

    public constructor(configuration: Configuration, authenticator: Authenticator) {
        this._configuration = configuration;
        this._authenticator = authenticator;
    }

    /*
     * Get a list of companies
     */
    public async getCompanyList(): Promise<Company[]> {

        const url = `${this._configuration.app.apiBaseUrl}/companies`;
        return await this._callApi(url, 'GET') as Company[];
    }

    /*
     * Get a list of transactions for a single company
     */
    public async getCompanyTransactions(id: string): Promise<CompanyTransactions> {

        const url = `${this._configuration.app.apiBaseUrl}/companies/${id}/transactions`;
        return await this._callApi(url, 'GET') as CompanyTransactions;
    }

    /*
     * The front end gets OAuth user info from the authorization server
     */
    public async getOAuthUserInfo(): Promise<OAuthUserInfo> {

        const data = await this._callApi(this._authenticator.getUserInfoEndpoint(), 'GET');
        return {
            givenName: data['given_name'] || '',
            familyName: data['family_name'] || '',
        };
    }

    /*
     * The front end gets other user information from its API
     */
    public async getApiUserInfo(): Promise<ApiUserInfo> {

        const url = `${this._configuration.app.apiBaseUrl}/userinfo`;
        return await this._callApi(url, 'GET') as ApiUserInfo;
    }

    /*
     * A central method to get data from an API and handle 401 retries
     */
    private async _callApi(url: string, method: Method, dataToSend?: any): Promise<any> {

        // Get the access token, and if it does not exist a login redirect will be triggered
        let token = await this._authenticator.getAccessToken();
        if (!token) {

            // Throw an error that will navigate to the login required view
            throw ErrorFactory.fromLoginRequired();
        }

        try {

            // Call the API
            return await this._callApiWithToken(url, method, dataToSend, token);

        } catch (e: any) {

            // Report Ajax errors if this is not a 401
            if (e.statusCode !== 401) {
                throw ErrorFactory.fromHttpError(e, url, 'web API');
            }

            // If we received a 401 then try to refresh the access token
            token = await this._authenticator.refreshAccessToken();
            if (!token) {

                // Throw an error that will navigate to the login required view
                throw ErrorFactory.fromLoginRequired();
            }

            // Call the API again
            return await this._callApiWithToken(url, method, dataToSend, token);
        }
    }

    /*
     * Do the work of calling the API
     */
    private async _callApiWithToken(
        url: string,
        method: Method,
        dataToSend: any,
        accessToken: string): Promise<any> {

        try {

            const response = await axios.request({
                url,
                method,
                data: dataToSend,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            AxiosUtils.checkJson(response.data);
            return response.data;

        } catch (e: any) {
            throw ErrorFactory.fromHttpError(e, url, 'web API');
        }
    }
}
