/**
 * Window Control Context Exposer
 *
 * This module exposes window control functionality to the renderer process
 * through Electron's contextBridge. It creates an 'electronWindow' object
 * in the window global scope that provides methods for:
 *
 * - Minimizing the application window
 * - Maximizing or restoring the application window
 * - Closing the application window
 *
 * Each method communicates with the main process via IPC to perform
 * the actual window operations using Electron's BrowserWindow API.
 */

import {
  WINDOW_MINIMIZE_CHANNEL,
  WINDOW_MAXIMIZE_CHANNEL,
  WINDOW_CLOSE_CHANNEL,
} from "./window-channels";

/**
 * Expose window control methods to the renderer process
 * This function is called from the preload script
 */
export function exposeWindowContext() {
  const { contextBridge, ipcRenderer } = window.require("electron");

  // Create the electronWindow object with methods that invoke IPC channels
  contextBridge.exposeInMainWorld("electronWindow", {
    minimize: () => ipcRenderer.invoke(WINDOW_MINIMIZE_CHANNEL),
    maximize: () => ipcRenderer.invoke(WINDOW_MAXIMIZE_CHANNEL),
    close: () => ipcRenderer.invoke(WINDOW_CLOSE_CHANNEL),
  });
}
