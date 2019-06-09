import {ICustomClaimsProvider} from '../extensibility/icustomClaimsProvider';
import {CoreApiClaims} from './coreApiClaims';

/*
 * This class is injected into framework authentication handling
 * Due to TypeScript type erasure the framework is unable to new up TClaims related items itself
 */
export class ClaimsSupplier<TClaims extends CoreApiClaims> {

    /*
     * Plumbing to enable the framework to create the correct generic type at runtime
     * We need to pass in a constructor function plus paremters for constructor arguments
     */
    public static createInstance<TClaimsSupplier, TClaimsX extends CoreApiClaims>(
        construct: new (c: () => TClaimsX, cp: () => ICustomClaimsProvider<TClaimsX>) => TClaimsSupplier,
        claimsSupplier: () => TClaimsX,
        customClaimsProviderSupplier: () => ICustomClaimsProvider<TClaimsX>): TClaimsSupplier {

        return new construct(claimsSupplier, customClaimsProviderSupplier);
    }

    // Injected dependencies
    private _claimsSupplier: () => TClaims;
    private _customClaimsProviderSupplier: () => ICustomClaimsProvider<TClaims>;

    /*
     * Receive dependencies
     */
    public constructor(
        claimsSupplier: () => TClaims,
        customClaimsProviderSupplier: () => ICustomClaimsProvider<TClaims>) {

        this._claimsSupplier = claimsSupplier;
        this._customClaimsProviderSupplier = customClaimsProviderSupplier;
    }

    /*
     * Create new claims of the concrete API's type
     */
    public createEmptyClaims(): TClaims {
        return this._claimsSupplier();
    }

    /*
     * Create a new custom claims provider of the concrete API's type
     */
    public createCustomClaimsProvider(): ICustomClaimsProvider<TClaims> {
        return this._customClaimsProviderSupplier();
    }
}
