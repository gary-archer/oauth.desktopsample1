/*
 * A holder for OAuth settings
 */
export interface OAuthConfiguration {
    authority: string;
    clientId: string;
    redirectPath: string;
    scope: string;
    loopbackHostname: string;
    loopbackMinPort: number;
    loopbackMaxPort: number;
    postLoginPage: string;
}
