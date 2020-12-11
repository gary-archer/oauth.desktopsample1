import $ from 'jquery';
import mustache from 'mustache';
import {ApiClient} from '../api/client/apiClient';

/*
 * The user info view renders details of the logged in user
 */
export class UserInfoView {

    /*
     * Load data and update the view
     */
    public async load(rootElement: string, apiClient: ApiClient): Promise<void> {

        // Show nothing when logged out
        if (location.hash.indexOf('loggedout') !== -1) {
            $('#username').text('');
            return;
        }

        // Make the API call to get user info
        const claims = await apiClient.getUserInfo();

        // Render results
        if (claims && claims.givenName && claims.familyName) {

            const html = mustache.render('{{givenName}} {{familyName}}', claims)
            $(`#${rootElement}`).text(html);
        }
    }

    /*
     * Clear user info after logout
     */
    public async clear(rootElement: string): Promise<void> {
        $(`#${rootElement}`).text('');
    }
}
