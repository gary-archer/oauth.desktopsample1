import {controller, httpGet} from 'inversify-express-utils';
import {BasicApiClaims} from '../entities/basicApiClaims';
import {UserInfoClaims} from '../entities/userInfoClaims';
import {BaseApiController} from './baseApiController';

/*
 * A controller class to return user info
 */
@controller('/userclaims')
export class UserInfoController extends BaseApiController {

    /*
     * Return any user claims needed by the UI
     */
    @httpGet('/current')
    private getUserClaims(): UserInfoClaims {

        // Log the operation name, which the framework cannot derive
        super.setOperationName(this.getUserClaims.name);

        // We can get claims from the HTTP context
        const claims = super.getHttpContext().user.details as BasicApiClaims;

        // Return user info to the UI
        return {
            givenName: claims.givenName,
            familyName: claims.familyName,
            email: claims.email,
        } as UserInfoClaims;
    }
}
