/*
 * A utility class to manage navigating to login required and returning to the previous location after login
 */
export class LoginNavigation {

    /*
     * Start the login workflow by updating the hash fragment, which will invoke the login required view
     */
    public static navigateToLoginRequired(): void {

        // Record the previous main location unless we are already in login required
        location.hash = location.hash.length > 1 ?
            `#loggedout&return=${encodeURIComponent(location.hash)}` :
            '#loggedout';
    }

    /*
     * Restore the location before we moved to login required above
     */
    public static restorePreLoginLocation(): void {

        if (location.hash.length > 1) {

            // Use this library to get the hash fragment parts, which are returned in a 'query' object
            const params = new URLSearchParams(location.hash.substring(1));
            const returnPath = params.get('return');
            if (returnPath) {

                // If so return to the pre login location
                const hash = decodeURIComponent(returnPath);
                location.hash = hash;
                return;
            }
        }

        // Otherwise move home
        location.hash = '#';
    }
}
