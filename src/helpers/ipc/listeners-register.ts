/**
 * IPC Listeners Registration Module
 *
 * This module centralizes the registration of all IPC event listeners
 * that handle communication between the main and renderer processes.
 *
 * It sets up listeners for:
 * - Window control (minimize, maximize, close)
 * - Theme management (dark mode, light mode, system)
 */

import { BrowserWindow } from "electron";
import { addThemeEventListeners } from "./theme/theme-listeners";
import { addWindowEventListeners } from "./window/window-listeners";

/**
 * Register all IPC event listeners for the application
 *
 * @param mainWindow - The main application window to attach listeners to
 */
export default function registerListeners(mainWindow: BrowserWindow) {
  addWindowEventListeners(mainWindow);
  addThemeEventListeners();
}
