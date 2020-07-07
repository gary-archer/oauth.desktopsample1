/*
 * A simple view for the header buttons
 */
export class HeaderButtonsView {

    private readonly _onHome: () => void;
    private readonly _onReloadData: () => void;
    private readonly _onExpireAccessToken: () => void;
    private readonly _onExpireRefreshToken: () => void;
    private readonly _onLogout: () => Promise<void>;

    public constructor(
        onHome: () => void,
        onReloadData: () => void,
        onExpireAccessToken: () => void,
        onExpireRefreshToken: () => void,
        onLogout: () => Promise<void>) {

        this._onHome = onHome;
        this._onReloadData = onReloadData;
        this._onExpireAccessToken = onExpireAccessToken;
        this._onExpireRefreshToken = onExpireRefreshToken;
        this._onLogout = onLogout;
    }

    /*
     * Render the view
     */
    public load() {

        const html =
            `<div class='row'>
                <div class='col-1 my-2 d-flex'>
                </div>
                <div class='col-2 my-2 d-flex'>
                    <button id='btnHome' type='button' class='btn btn-primary btn-block p-1'>Home</button>
                </div>
                <div class='col-2 my-2 d-flex'>
                    <button id='btnReloadData' type='button' disabled class='btn btn-primary btn-block p-1 sessionbutton'>Reload Data</button>
                </div>
                <div class='col-2 my-2 d-flex'>
                    <button id='btnExpireAccessToken' type='button' disabled class='btn btn-primary btn-block p-1 sessionbutton'>Expire Access Token</button>
                </div>
                <div class='col-2 my-2 d-flex'>
                    <button id='btnExpireRefreshToken' type='button' disabled class='btn btn-primary btn-block p-1 sessionbutton'>Expire Refresh Token</button>
                </div>
                <div class='col-2 my-2 d-flex'>
                    <button id='btnLogout' type='button' disabled class='btn btn-primary btn-block p-1 sessionbutton'>Logout</button>
                </div>
                <div class='col-1 my-2 d-flex'>
                </div>
            </div>`;
        $('#headerbuttons').html(html);

        // Button clicks are handled by the parent class
        $('#btnHome').click(this._onHome);
        $('#btnReloadData').click(this._onReloadData);
        $('#btnExpireAccessToken').click(this._onExpireAccessToken);
        $('#btnExpireRefreshToken').click(this._onExpireRefreshToken);
        $('#btnLogout').click(this._onLogout);
    }

    /*
     * Buttons are disabled before data is loaded
     */
    public disableSessionButtons(): void {
        $('.sessionbutton').prop('disabled', true);
    }

    /*
     * Buttons are enabled when all data loads successfully
     */
    public enableSessionButtons(): void {
        $('.sessionbutton').prop('disabled', false);
    }
}
