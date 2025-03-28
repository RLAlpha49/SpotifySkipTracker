/**
 * Window Control Context Bridge
 *
 * Securely exposes window management functionality to the renderer process
 * through Electron's contextBridge API, maintaining strict process isolation.
 *
 * This module creates a controlled API surface that allows the web-based
 * renderer to manipulate the native application window without direct access
 * to Node.js APIs, maintaining Electron's security architecture while enabling
 * essential window controls.
 *
 * The exposed 'electronWindow' global object provides methods for:
 * - minimize: Reducing the window to taskbar/dock
 * - maximize: Expanding window to full screen or restoring previous size
 * - close: Initiating the window close sequence with proper event handling
 *
 * Each method communicates through predefined IPC channels to maintain
 * a clear security boundary between processes.
 */

import {
  WINDOW_CLOSE_CHANNEL,
  WINDOW_MAXIMIZE_CHANNEL,
  WINDOW_MINIMIZE_CHANNEL,
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
