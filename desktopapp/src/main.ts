/*
 * The Electron main process, which loads the renderer process app.ts
 */

import {app, BrowserWindow, Menu, session, shell} from 'electron';
import * as DefaultMenu from 'electron-default-menu';
import * as Path from 'path';
import * as Url from 'url';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win: any = null;

function createWindow() {

    // Create the browser window
    // Note that node integration is needed in order to use 'require' in index.html
    win = new BrowserWindow({
        width: 1024,
        height: 768,
        minWidth: 480,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
        },
    });

    // Ensure that our window has its own menu after Electron Packager has run
    const menu = DefaultMenu(app, shell);
    Menu.setApplicationMenu(Menu.buildFromTemplate(menu));

    // Load the index.html of the app from the file system
    win.loadURL(Url.format({
        pathname: Path.join(__dirname, '../index.html'),
        protocol: 'file:',
        slashes: true,
    }));

    // Open the developer tools at application startup if required
    // win.webContents.openDevTools();

    // Emitted when the window is closed
    win.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element
        win = null;
    });

    // Remove the 'Origin: file://' deault header which Okta rejected for security reasons with this message:
    // 'Browser requests to the token endpoint must be part of at least one whitelisted redirect_uri'
    const headerCallback = (details: any, callback: any) => {

        if (details.requestHeaders.Origin) {
            delete details.requestHeaders.Origin;
        }

        callback({cancel: false, requestHeaders: details.requestHeaders});
    };
    session.defaultSession!.webRequest.onBeforeSendHeaders({} as any, headerCallback);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {

    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {

    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open
    if (win === null) {
        createWindow();
    }
});
