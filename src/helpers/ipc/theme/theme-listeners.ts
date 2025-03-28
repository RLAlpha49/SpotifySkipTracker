/**
 * Theme Management IPC Handler Implementation
 *
 * Implements the main process side of theme control, handling requests
 * from the renderer process to manipulate application appearance settings.
 *
 * This module integrates with Electron's nativeTheme API to provide a complete
 * theme management solution that bridges the gap between operating system
 * preferences and application-specific theme settings. The implementation:
 *
 * - Registers secure IPC handlers for all theme operations
 * - Maps incoming requests to appropriate nativeTheme API calls
 * - Implements intelligent theme toggling between light/dark modes
 * - Provides OS-synchronized theme management through 'system' mode
 * - Returns current theme states to the renderer when needed
 *
 * By centralizing all theme-related handling in this module, the application
 * maintains a consistent approach to theming while ensuring the security
 * boundary between processes remains intact.
 */

import { ipcMain, nativeTheme } from "electron";
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
