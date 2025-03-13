/**
 * IPC listeners registration module
 *
 * Centralizes registration of all IPC event listeners that handle
 * communication between the main and renderer processes.
 *
 * Registers listeners for:
 * - Window control operations (minimize, maximize, close)
 * - Theme management (dark/light mode switching)
 */

import { BrowserWindow } from "electron";
import { addThemeEventListeners } from "./theme/theme-listeners";
import { addWindowEventListeners } from "./window/window-listeners";

/**
 * Registers all IPC event listeners for the application
 *
 * @param mainWindow - The main BrowserWindow instance to attach listeners to
 */
export default function registerListeners(mainWindow: BrowserWindow): void {
  addWindowEventListeners(mainWindow);
  addThemeEventListeners();
}
