/*
 * A holder for OAuth settings
 */
export interface OAuthConfiguration {
    authority: string;
    clientId: string;
    loopbackMinPort: number;
    loopbackMaxPort: number;
    scope: string;
    postLoginPage: string;
}
