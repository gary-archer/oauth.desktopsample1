import {Request} from 'express';
import {inject, injectable} from 'inversify';
import {FRAMEWORKTYPES} from '../configuration/frameworkTypes';
import {ClientError} from '../errors/clientError';
import {ClaimsCache} from './claimsCache';
import {ClaimsSupplier} from './claimsSupplier';
import {CoreApiClaims} from './coreApiClaims';
import {IAuthenticator} from './iauthenticator';

/*
 * The entry point for the processing to validate tokens and return claims
 * Our approach provides extensible claims to our API and enables high performance
 */
@injectable()
export class ClaimsMiddleware<TClaims extends CoreApiClaims> {

    // Injected dependencies
    private readonly _cache: ClaimsCache<TClaims>;
    private readonly _authenticator: IAuthenticator;
    private readonly _claimsSupplier: ClaimsSupplier<TClaims>;

    /*
     * Receive dependencies
     */
    public constructor(
        @inject(FRAMEWORKTYPES.ClaimsCache) cache: ClaimsCache<TClaims>,
        @inject(FRAMEWORKTYPES.Authenticator) authenticator: IAuthenticator,
        @inject(FRAMEWORKTYPES.ClaimsSupplier) claimsSupplier: ClaimsSupplier<TClaims>) {

        this._cache = cache;
        this._authenticator = authenticator;
        this._claimsSupplier = claimsSupplier;
    }

    /*
     * Authorize a request and return claims on success
     */
    public async authorizeRequestAndGetClaims(request: Request): Promise<TClaims> {

        // First read the access token
        const accessToken = this._readAccessToken(request);
        if (!accessToken) {
            throw ClientError.create401('No access token was supplied in the bearer header');
        }

        // Bypass and use cached results if they exist
        const cachedClaims = await this._cache.getClaimsForToken(accessToken);
        if (cachedClaims) {
            return cachedClaims;
        }

        // Create new claims which we will then populate
        const claims = this._claimsSupplier.createEmptyClaims();

        // Do the authentication work to get claims, which in our case means OAuth processing
        const expiry = await this._authenticator.authenticateAndSetClaims(accessToken, request, claims);

        // Add any custom product specific custom claims if required
        await this._claimsSupplier.createCustomClaimsProvider().addCustomClaims(accessToken, request, claims);

        // Cache the claims against the token hash until the token's expiry time
        // The next time the API is called, all of the above results can be quickly looked up
        await this._cache.addClaimsForToken(accessToken, expiry, claims);

        // Return the result on success
        return claims;
    }

    /*
     * Try to read the token from the authorization header
     */
    private _readAccessToken(request: Request): string | null {

        const authorizationHeader = request.header('authorization');
        if (authorizationHeader) {
            const parts = authorizationHeader.split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') {
                return parts[1];
            }
        }

        return null;
    }
}
