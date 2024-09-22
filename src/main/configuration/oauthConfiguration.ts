/*
 * A holder for OAuth settings
 */
export interface OAuthConfiguration {
    authority: string;
    clientId: string;
    loopbackHostname: string;
    loopbackMinPort: number;
    loopbackMaxPort: number;
    scope: string;
    postLoginPage: string;
}
