import mustache from 'mustache';
import {ApiClient} from '../api/apiClient';
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

        // Make the requests to get user info
        const oauthUserInfo = await apiClient.getOAuthUserInfo();
        const apiUserInfo = await apiClient.getApiUserInfo();

        // Render results
        if (oauthUserInfo && oauthUserInfo.givenName && oauthUserInfo.familyName) {

            let text = mustache.render('{{givenName}} {{familyName}}', oauthUserInfo);
            if (apiUserInfo.role === 'admin') {
                text += ' (ADMIN)';
            }

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
