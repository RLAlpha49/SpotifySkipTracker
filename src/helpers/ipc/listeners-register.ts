/**
 * @packageDocumentation
 * @module listeners-register
 * @description IPC Listener Registration Hub
 *
 * Centralizes and orchestrates the initialization of all inter-process
 * communication channels between the main Electron process and renderer processes.
 *
 * This module serves as the single integration point for all IPC subsystems,
 * ensuring proper initialization order and preventing listener duplication issues.
 * By centralizing listener registration, it provides a clean architecture that:
 *
 * - Simplifies application startup sequence
 * - Ensures all communication channels are properly established
 * - Prevents memory leaks from duplicate listener registration
 * - Creates a consistent pattern for adding new IPC subsystems
 * - Enables better debugging of communication pathways
 *
 * The modular design allows for separation of concerns across different
 * functional domains (window management, theme control, etc.) while
 * maintaining a clean initialization process.
 */

import { BrowserWindow } from "electron";
import { addThemeEventListeners } from "./theme/theme-listeners";
import { addWindowEventListeners } from "./window/window-listeners";

/**
 * Registers all IPC event listeners for the application
 *
 * @param mainWindow - The main BrowserWindow instance to attach listeners to
 * @source
 */
export default function registerListeners(mainWindow: BrowserWindow): void {
  addWindowEventListeners(mainWindow);
  addThemeEventListeners();
}
