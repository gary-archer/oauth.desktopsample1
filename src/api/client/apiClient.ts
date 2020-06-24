import axios, {AxiosRequestConfig, Method} from 'axios';
import {ErrorHandler} from '../../plumbing/errors/errorHandler';
import {Authenticator} from '../../plumbing/oauth/authenticator';
import {AxiosUtils} from '../../plumbing/utilities/axiosUtils';
import {HttpProxy} from '../../plumbing/utilities/httpProxy';
import {Company} from '../entities/company';
import {CompanyTransactions} from '../entities/companyTransactions';
import {UserInfoClaims} from '../entities/userInfoClaims';

/*
 * Logic related to making API calls
 */
export class ApiClient {

    private readonly _apiBaseUrl: string;
    private readonly _authenticator: Authenticator;

    public constructor(apiBaseUrl: string, authenticator: Authenticator) {

        this._apiBaseUrl = apiBaseUrl;
        if (!this._apiBaseUrl.endsWith('/')) {
            this._apiBaseUrl += '/';
        }

        this._authenticator = authenticator;
    }

    /*
     * We download user info from the API so that we can get any data we need
     */
    public async getUserInfo(): Promise<UserInfoClaims> {

        return await this._callApi('userclaims/current', 'GET') as UserInfoClaims;
    }

    /*
     * We download user info from the API so that we can get any data we need
     */
    public async getCompanyList(): Promise<Company[]> {

        return await this._callApi('companies', 'GET', null) as Company[];
    }

    /*
     * We download user info from the API so that we can get any data we need
     */
    public async getCompanyTransactions(id: string): Promise<CompanyTransactions> {

        return await this._callApi(`companies/${id}/transactions`, 'GET', null) as CompanyTransactions;
    }

    /*
     * A central method to get data from an API and handle 401 retries
     */
    private async _callApi(
        path: string,
        method: Method,
        dataToSend?: any): Promise<any> {

        // Get the full path
        const url = `${this._apiBaseUrl}${path}`;

        // Get the access token, and if it does not exist a login redirect will be triggered
        let token = await this._authenticator.getAccessToken();

        try {

            // Call the API
            return await this._callApiWithToken(url, method, dataToSend, token);

        } catch (error1) {

            // Report Ajax errors if this is not a 401
            if (!this._isApi401Error(error1)) {
                throw ErrorHandler.getFromApiError(error1, url);
            }

            // If we received a 401 then clear the failing access token from storage and get a new one
            token = await this._authenticator.refreshAccessToken();

            // The general pattern for calling an OAuth secured API is to retry 401s once with a new token
            try {
                // Call the API again
                return await this._callApiWithToken(url, method, dataToSend, token);

            } catch (error2) {

                // Report Ajax errors for the retry
                throw ErrorHandler.getFromApiError(error2, url);
            }
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

        const options: AxiosRequestConfig = {
            url,
            method,
            data: dataToSend,
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            proxy: HttpProxy.get(),
        };

        const response = await axios.request(options);
        AxiosUtils.checkJson(response.data);
        return response.data;
    }

    /*
     * API 401s are handled via a retry with a new token
     */
    private _isApi401Error(error: any) {
        return error.response && error.response.status === 401;
    }
}
