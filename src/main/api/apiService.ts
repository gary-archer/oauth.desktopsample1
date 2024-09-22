import axios, {AxiosRequestConfig, Method} from 'axios';
import {ApiUserInfo} from '../../shared/api/apiUserInfo';
import {Company} from '../../shared/api/company';
import {CompanyTransactions} from '../../shared/api/companyTransactions';
import {OAuthUserInfo} from '../../shared/api/oauthUserInfo';
import {ErrorFactory} from '../../shared/errors/errorFactory';
import {Configuration} from '../configuration/configuration';
import {AuthenticatorService} from '../oauth/authenticatorService';
import {AxiosUtils} from '../utilities/axiosUtils';
import {HttpProxy} from '../utilities/httpProxy';

/*
 * API operations from the main side of the app
 */
export class ApiService {

    private readonly _configuration: Configuration;
    private readonly _authenticatorService: AuthenticatorService;
    private readonly _httpProxy: HttpProxy;

    public constructor(
        configuration: Configuration,
        authenticatorService: AuthenticatorService,
        httpProxy: HttpProxy) {

        this._configuration = configuration;
        this._authenticatorService = authenticatorService;
        this._httpProxy = httpProxy;
    }

    /*
     * Get a list of companies
     */
    public async getCompanyList() : Promise<Company[] | null> {

        const url = `${this._configuration.app.apiBaseUrl}/companies`;
        return await this._callApi('GET', url);
    }

    /*
     * Get a list of transactions for a single company
     */
    public async getCompanyTransactions(id: string) : Promise<CompanyTransactions | null> {

        const url = `${this._configuration.app.apiBaseUrl}/companies/${id}/transactions`;
        return await this._callApi('GET', url);
    }

    /*
     * Get user information from the authorization server
     */
    public async getOAuthUserInfo() : Promise<OAuthUserInfo | null> {

        const url = await this._authenticatorService.getUserInfoEndpoint();
        if (!url) {
            return null;
        }

        const data = await this._callApi('GET', url);
        if (!data) {
            return null;
        }

        return {
            givenName: data['given_name'] || '',
            familyName: data['family_name'] || '',
        };
    }

    /*
     * Download user attributes the UI needs that are not stored in the authorization server
     */
    public async getApiUserInfo() : Promise<ApiUserInfo | null> {

        const url = `${this._configuration.app.apiBaseUrl}/userinfo`;
        return await this._callApi('GET', url);
    }

    /*
     * A parameterized method containing application specific logic for managing API calls
     */
    private async _callApi(
        method: Method,
        url: string,
        dataToSend: any = null): Promise<any> {

        try {

            // A logic is required if we don't have an access token
            const accessToken = await this._authenticatorService.getAccessToken();
            if (!accessToken) {
                throw ErrorFactory.fromLoginRequired();
            }

            const headers: any = {
                'Authorization': `Bearer ${accessToken}`,
            };

            const requestOptions = {
                url,
                method,
                data: dataToSend,
                headers,
            } as AxiosRequestConfig;

            if (this._httpProxy.agent) {
                requestOptions.httpsAgent = this._httpProxy.agent;
            }

            const response = await axios.request(requestOptions);
            AxiosUtils.checkJson(response.data);
            return response.data;

        } catch (e: any) {

            // Report refresh errors
            throw ErrorFactory.fromHttpError(e, url, 'API');
        }
    }
}
