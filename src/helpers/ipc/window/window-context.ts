/**
 * Window control context bridge module
 *
 * Exposes window control functionality to the renderer process through
 * Electron's contextBridge API. Creates an 'electronWindow' object in
 * the window global scope with methods for window operations.
 *
 * Available methods:
 * - minimize: Minimizes the application window
 * - maximize: Toggles window between maximized and normal state
 * - close: Closes the application window
 */

import {
  WINDOW_MINIMIZE_CHANNEL,
  WINDOW_MAXIMIZE_CHANNEL,
  WINDOW_CLOSE_CHANNEL,
} from "./window-channels";

/**
 * Exposes window control methods to the renderer process via contextBridge
 *
 * @returns void
 */
export function exposeWindowContext(): void {
  const { contextBridge, ipcRenderer } = window.require("electron");

  // Create the electronWindow object with methods that invoke IPC channels
  contextBridge.exposeInMainWorld("electronWindow", {
    minimize: () => ipcRenderer.invoke(WINDOW_MINIMIZE_CHANNEL),
    maximize: () => ipcRenderer.invoke(WINDOW_MAXIMIZE_CHANNEL),
    close: () => ipcRenderer.invoke(WINDOW_CLOSE_CHANNEL),
  });
}
