/*
 * A holder for OAuth settings
 */
export interface OAuthConfiguration {
    authority: string;
    clientId: string;
    scope: string;
    loopbackMinPort: number;
    loopbackMaxPort: number;
    postLoginBrowserSuccess: string;
    postLoginBrowserError: string;
}
