/**
 * @packageDocumentation
 * @module window-listeners
 * @description Window Control IPC Handler Implementation
 *
 * Implements the main process side of window management IPC communication,
 * handling requests from the renderer process to control the application window.
 *
 * This module registers handlers for standardized window control operations,
 * utilizing Electron's BrowserWindow API to manipulate the native window while
 * maintaining the security boundary between processes. The implementation:
 *
 * - Registers secure IPC handlers for each window operation
 * - Associates each handler with the appropriate BrowserWindow methods
 * - Adds intelligence like toggling between maximize/restore states
 * - Provides consistent behavior across platforms
 * - Ensures window references are properly maintained
 *
 * These handlers receive requests through the predefined IPC channels from
 * window-channels.ts, completing the secure communication pathway from
 * renderer to main process.
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
 * @source
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
