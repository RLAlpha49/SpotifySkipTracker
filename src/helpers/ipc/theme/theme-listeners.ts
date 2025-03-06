/**
 * Theme IPC Listeners
 *
 * This module sets up IPC handlers in the main process to respond to
 * theme-related requests from the renderer process. It uses Electron's
 * nativeTheme API to control the application's appearance.
 *
 * The handlers allow the renderer to:
 * - Get the current theme mode
 * - Toggle between light and dark mode
 * - Set specific theme modes (dark, light, system)
 *
 * These handlers are registered when the application starts and remain
 * active throughout the application's lifecycle.
 */

import { nativeTheme } from "electron";
import { ipcMain } from "electron";
import {
  THEME_MODE_CURRENT_CHANNEL,
  THEME_MODE_DARK_CHANNEL,
  THEME_MODE_LIGHT_CHANNEL,
  THEME_MODE_SYSTEM_CHANNEL,
  THEME_MODE_TOGGLE_CHANNEL,
} from "./theme-channels";

/**
 * Register all theme-related IPC event listeners
 * This function is called during application initialization
 */
export function addThemeEventListeners() {
  // Get the current theme mode
  ipcMain.handle(THEME_MODE_CURRENT_CHANNEL, () => nativeTheme.themeSource);

  // Toggle between light and dark mode
  ipcMain.handle(THEME_MODE_TOGGLE_CHANNEL, () => {
    if (nativeTheme.shouldUseDarkColors) {
      nativeTheme.themeSource = "light";
    } else {
      nativeTheme.themeSource = "dark";
    }
    return nativeTheme.shouldUseDarkColors;
  });

  // Set dark mode
  ipcMain.handle(
    THEME_MODE_DARK_CHANNEL,
    () => (nativeTheme.themeSource = "dark"),
  );

  // Set light mode
  ipcMain.handle(
    THEME_MODE_LIGHT_CHANNEL,
    () => (nativeTheme.themeSource = "light"),
  );

  // Set system theme mode
  ipcMain.handle(THEME_MODE_SYSTEM_CHANNEL, () => {
    nativeTheme.themeSource = "system";
    return nativeTheme.shouldUseDarkColors;
  });
}
