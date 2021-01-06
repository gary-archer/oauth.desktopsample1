import $ from 'jquery';
import {Requestor} from '@openid/appauth';
import {ErrorHandler} from '../../errors/errorHandler';

/*
 * Override the requestor object of AppAuthJS, so that OAuth error codes are returned
 */
export class CustomRequestor extends Requestor {

    /*
     * Run the request and return OAuth errors as objects
     */
    public async xhr<T>(settings: JQueryAjaxSettings): Promise<T> {

        try {

            const options: any = {
                url: settings.url,
                dataType: 'json',
                contentType: 'application/json',
                type: settings.method,
                headers: settings.headers,
            };

            if (settings.data) {
                options.data = settings.data;
            }

            const response = await $.ajax(options);
            return response as T;

        } catch (e) {

            // If the response is an OAuth error object from the Authorization Server then throw that
            if (e.responseJSON) {
                throw e.responseJSON;
            }

            // Otherwise throw the technical error details
            throw ErrorHandler.getFromApiError(e, settings.url || '');
        }
    }
}
