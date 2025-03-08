/**
 * Theme IPC listener module
 *
 * Configures IPC handlers in the main process for theme-related operations.
 * Uses Electron's nativeTheme API to control application appearance.
 *
 * Implements handlers for:
 * - Getting current theme mode (dark/light/system)
 * - Toggling between light and dark modes
 * - Setting specific theme modes (dark, light, system)
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
 * Registers all theme-related IPC event listeners
 *
 * @returns void
 */
export function addThemeEventListeners(): void {
  // Current theme mode handler
  ipcMain.handle(THEME_MODE_CURRENT_CHANNEL, () => nativeTheme.themeSource);

  // Theme toggle handler
  ipcMain.handle(THEME_MODE_TOGGLE_CHANNEL, () => {
    if (nativeTheme.shouldUseDarkColors) {
      nativeTheme.themeSource = "light";
    } else {
      nativeTheme.themeSource = "dark";
    }
    return nativeTheme.shouldUseDarkColors;
  });

  // Dark mode handler
  ipcMain.handle(
    THEME_MODE_DARK_CHANNEL,
    () => (nativeTheme.themeSource = "dark"),
  );

  // Light mode handler
  ipcMain.handle(
    THEME_MODE_LIGHT_CHANNEL,
    () => (nativeTheme.themeSource = "light"),
  );

  // System theme handler
  ipcMain.handle(THEME_MODE_SYSTEM_CHANNEL, () => {
    nativeTheme.themeSource = "system";
    return nativeTheme.shouldUseDarkColors;
  });
}
