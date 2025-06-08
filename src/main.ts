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

    private configuration: Configuration;
    private ipcEvents: IpcMainEvents;
    private window: BrowserWindow | null;

    public constructor() {
        this.configuration = ConfigurationLoader.load(`${app.getAppPath()}/desktop.config.json`);
        this.ipcEvents = new IpcMainEvents(this.configuration);
        this.window = null;
        this.setupCallbacks();
    }

    /*
     * The entry point function
     */
    public execute(): void {

        // This method will be called when Electron has finished initialization and is ready to create browser windows
        // Some APIs can only be used after this event occurs
        app.on('ready', this.createMainWindow);

        // Handle reactivation
        app.on('activate', this.onActivate);

        // Quit when all windows are closed
        app.on('window-all-closed', this.onAllWindowsClosed);
    }

    /*
     * Do the main window creation
     */
    private createMainWindow(): void {

        // Create the browser window
        // Create the window and use Electron recommended security options
        // https://www.electronjs.org/docs/tutorial/security
        this.window = new BrowserWindow({
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
        this.ipcEvents.register(this.window);

        // Load the index.html of the app from the file system
        this.window.loadFile('./index.html');

        // Configure HTTP headers
        this.initialiseHttpHeaders();

        // Emitted when the window is closed
        this.window.on('closed', this.onClosed);
    }

    /*
     * On macOS it's common to re-create a window in the app when the
     * dock icon is clicked and there are no other windows open
     */
    private onActivate(): void {

        if (!this.window) {
            this.createMainWindow();
        }
    }

    /*
     * Set a content security policy for the renderer process
     */
    private initialiseHttpHeaders() {

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
    private onClosed(): void {
        this.window = null;
    }

    /*
     * Quit when all windows are closed
     */
    private onAllWindowsClosed(): void {

        // On macOS, applications and their menu bar stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            app.quit();
        }
    }

    /*
     * Ensure that the this parameter is available in async callbacks
     */
    private setupCallbacks() {
        this.createMainWindow = this.createMainWindow.bind(this);
        this.onActivate = this.onActivate.bind(this);
        this.onClosed = this.onClosed.bind(this);
        this.onAllWindowsClosed = this.onAllWindowsClosed.bind(this);
    }
}

// Execute the main class
const main = new Main();
main.execute();
