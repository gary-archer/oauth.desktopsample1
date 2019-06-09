import {Request} from 'express';
import {CoreApiClaims} from './coreApiClaims';

/*
 * An authenticator interface with different implementations for public and private APIs
 */
export interface IAuthenticator {
    authenticateAndSetClaims(accessToken: string, request: Request, claims: CoreApiClaims): Promise<number>;
}
