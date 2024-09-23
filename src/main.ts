/*
 * The Electron main process, which loads the renderer process app.ts
 */

import {app, BrowserWindow, session} from 'electron';
import path from 'path';
import {Configuration} from './main/configuration/configuration';
import {ConfigurationLoader} from './main/configuration/configurationLoader';
import {IpcMainEvents} from './main/ipcMainEvents';

/*
 * The Electron main process entry point
 */
class Main {

    private _configuration: Configuration;
    private _ipcEvents: IpcMainEvents;
    private _window: BrowserWindow | null;

    public constructor() {
        this._configuration = ConfigurationLoader.load(`${app.getAppPath()}/desktop.config.json`);
        this._ipcEvents = new IpcMainEvents(this._configuration);
        this._window = null;
        this._setupCallbacks();
    }

    /*
     * The entry point function
     */
    public execute(): void {

        // This method will be called when Electron has finished initialization and is ready to create browser windows
        // Some APIs can only be used after this event occurs
        app.on('ready', this._createMainWindow);

        // Handle reactivation
        app.on('activate', this._onActivate);

        // Quit when all windows are closed
        app.on('window-all-closed', this._onAllWindowsClosed);
    }

    /*
     * Do the main window creation
     */
    private _createMainWindow(): void {

        // Create the browser window
        // Create the window and use Electron recommended security options
        // https://www.electronjs.org/docs/tutorial/security
        this._window = new BrowserWindow({
            width: 1280,
            height: 720,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true,
                preload: path.join(app.getAppPath(), './preload.js'),
            },
        });

        // Register for event based communication with the renderer process
        this._ipcEvents.register(this._window);

        // Load the index.html of the app from the file system
        this._window.loadFile('./index.html');

        // Configure HTTP headers
        this._initialiseHttpHeaders();

        // Emitted when the window is closed
        this._window.on('closed', this._onClosed);
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
     * Set required or recommended headers
     */
    private _initialiseHttpHeaders() {

        // Remove the 'Origin: file://' default header which may be rejected for security reasons with this message
        // 'Browser requests to the token endpoint must be part of at least one whitelisted redirect_uri'
        session.defaultSession.webRequest.onBeforeSendHeaders({urls: []} as any, (details, callback) => {

            if (details.requestHeaders.Origin) {
                delete details.requestHeaders.Origin;
            }

            callback({cancel: false, requestHeaders: details.requestHeaders});
        });

        // Set a content security policy as a security best practice
        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {

            let policy = '';
            policy += "default-src 'none';";
            policy += " script-src 'self';";
            policy += " connect-src 'self'";
            policy += " child-src 'self';";
            policy += " img-src 'self';";
            policy += " style-src 'self';";
            policy += " object-src 'none';";
            policy += " frame-ancestors 'none';";
            policy += " base-uri 'self';";
            policy += " form-action 'self'";

            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': [policy],
                },
            });
        });
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
        this._onClosed = this._onClosed.bind(this);
        this._onAllWindowsClosed = this._onAllWindowsClosed.bind(this);
    }
}

// Execute the main class
const main = new Main();
main.execute();
