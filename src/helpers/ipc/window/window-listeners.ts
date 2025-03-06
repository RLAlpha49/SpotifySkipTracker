/**
 * Window Control IPC Listeners
 *
 * This module sets up IPC handlers in the main process to respond to
 * window control requests from the renderer process. It uses Electron's
 * BrowserWindow API to control the application window.
 *
 * The handlers allow the renderer to:
 * - Minimize the application window
 * - Maximize or restore the application window
 * - Close the application window
 *
 * These handlers are registered when the application starts and remain
 * active throughout the application's lifecycle.
 */

import { BrowserWindow, ipcMain } from "electron";
import {
  WINDOW_CLOSE_CHANNEL,
  WINDOW_MAXIMIZE_CHANNEL,
  WINDOW_MINIMIZE_CHANNEL,
} from "./window-channels";

/**
 * Register all window control IPC event listeners
 *
 * @param mainWindow - The main application window to control
 */
export function addWindowEventListeners(mainWindow: BrowserWindow) {
  // Handle window minimize request
  ipcMain.handle(WINDOW_MINIMIZE_CHANNEL, () => {
    mainWindow.minimize();
  });

  // Handle window maximize/restore request
  ipcMain.handle(WINDOW_MAXIMIZE_CHANNEL, () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  // Handle window close request
  ipcMain.handle(WINDOW_CLOSE_CHANNEL, () => {
    mainWindow.close();
  });
}
