import mustache from 'mustache';
import {ApiClient} from '../api/client/apiClient';
import {DomUtils} from './domUtils';

/*
 * The user info view renders details of the logged in user
 */
export class UserInfoView {

    /*
     * Load data and update the view
     */
    public async load(apiClient: ApiClient): Promise<void> {

        // Show nothing when logged out
        if (location.hash.indexOf('loginrequired') !== -1) {
            DomUtils.text('#username', '');
            return;
        }

        // Make the API call to get user info
        const userInfo = await apiClient.getUserInfo();

        // Render results
        if (userInfo && userInfo.givenName && userInfo.familyName) {
            const text = mustache.render('{{givenName}} {{familyName}}', userInfo);
            DomUtils.text('#username', text);
        }
    }

    /*
     * Clear user info after logout
     */
    public async clear(): Promise<void> {
        DomUtils.text('#username', '');
    }
}
