/**
 * Window control IPC listener module
 *
 * Configures IPC handlers in the main process for window control operations.
 * Uses Electron's BrowserWindow API to manipulate the application window.
 *
 * Implements handlers for:
 * - Minimizing the application window
 * - Maximizing or restoring the application window
 * - Closing the application window
 */

import { BrowserWindow, ipcMain } from "electron";
import {
  WINDOW_CLOSE_CHANNEL,
  WINDOW_MAXIMIZE_CHANNEL,
  WINDOW_MINIMIZE_CHANNEL,
} from "./window-channels";

/**
 * Registers all window control IPC event listeners
 *
 * @param mainWindow - The BrowserWindow instance to control
 * @returns void
 */
export function addWindowEventListeners(mainWindow: BrowserWindow): void {
  // Window minimize handler
  ipcMain.handle(WINDOW_MINIMIZE_CHANNEL, () => {
    mainWindow.minimize();
  });

  // Window maximize/restore handler
  ipcMain.handle(WINDOW_MAXIMIZE_CHANNEL, () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  // Window close handler
  ipcMain.handle(WINDOW_CLOSE_CHANNEL, () => {
    mainWindow.close();
  });
}
