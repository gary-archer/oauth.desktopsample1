/*
 * The Electron main process, which loads the renderer process app.ts
 */

import {app, BrowserWindow, ipcMain, Menu, session, shell} from 'electron';
import DefaultMenu from 'electron-default-menu';
import log from 'electron-log';
import {ApplicationEventNames} from './plumbing/events/applicationEventNames';

/*
 * The Electron main process entry point
 */
class Main {

    private _window: BrowserWindow | null;

    public constructor() {
        this._window = null;
        this._setupCallbacks();
    }

    /*
     * The entry point function
     */
    public execute(): void {

        // Show a startup message, which is reported to the console
        log.info('STARTING ELECTRON MAIN PROCESS');

        // This method will be called when Electron has finished initialization and is ready to create browser windows
        // Some APIs can only be used after this event occurs
        app.on('ready', this._createMainWindow);

        // Handle reactivation
        app.on('activate', this._onActivate);

        // Quit when all windows are closed
        app.on('window-all-closed', this._onAllWindowsClosed);

        // Set this to avoid a warning and to improve performance
        app.allowRendererProcessReuse = true;
    }

    /*
     * Do the main window creation
     */
    private _createMainWindow(): void {

        // Create the browser window
        // Note that node integration is needed in order to use 'require' in index.html
        this._window = new BrowserWindow({
            width: 1024,
            height: 768,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: true,
                enableRemoteModule: false,
                contextIsolation: false,
            },
        });

        // Ensure that our window has its own menu after Electron Packager has run
        const menu = DefaultMenu(app, shell);
        Menu.setApplicationMenu(Menu.buildFromTemplate(menu));

        // Load the index.html of the app from the file system
        this._window.loadFile('./index.html');

        // Configure HTTP headers
        this._initialiseOutgoingHttpRequestHeaders();

        // Register to be returned to the foreground once login completes
        ipcMain.on(ApplicationEventNames.ON_LOGIN_REACTIVATE, this._bringToForeground);

        // Emitted when the window is closed
        this._window.on('closed', this._onClosed);

        // Open the developer tools at startup if required
        // this._window.webContents.openDevTools();
    }

    /*
     * On macOS it's common to re-create a window in the app when the
     * dock icon is clicked and there are no other windows open
     */
    private _onActivate(): void {

        if (!this._window) {
            this._createMainWindow();
        }
    }

    /*
     * Remove the 'Origin: file://' deault header which may be rejected for security reasons with this message
     * 'Browser requests to the token endpoint must be part of at least one whitelisted redirect_uri'
     */
    private _initialiseOutgoingHttpRequestHeaders() {

        const headerCallback = (details: any, callback: any) => {

            if (details.requestHeaders.Origin) {
                delete details.requestHeaders.Origin;
            }

            callback({cancel: false, requestHeaders: details.requestHeaders});
        };
        session.defaultSession.webRequest.onBeforeSendHeaders({urls: []} as any, headerCallback);
    }

    /*
     * When a login response is received, bring our window to the foreground
     */
    private _bringToForeground(): void {
        this._window!.show();
    }

    /*
     * Dereference the window object, usually you would store windows
     * in an array if your app supports multi windows, this is the time
     * when you should delete the corresponding element
     */
    private _onClosed(): void {
        this._window = null;
    }

    /*
     * Quit when all windows are closed
     */
    private _onAllWindowsClosed(): void {

        // On macOS, applications and their menu bar stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            app.quit();
        }
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks() {
        this._createMainWindow = this._createMainWindow.bind(this);
        this._onActivate = this._onActivate.bind(this);
        this._bringToForeground = this._bringToForeground.bind(this);
        this._onClosed = this._onClosed.bind(this);
        this._onAllWindowsClosed = this._onAllWindowsClosed.bind(this);
    }
}

// Run our main class
const main = new Main();
main.execute();
