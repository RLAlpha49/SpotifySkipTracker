/**
 * Theme context bridge module
 *
 * Exposes theme-related functionality to the renderer process through Electron's
 * contextBridge API. Creates a 'themeMode' object in the window global scope with
 * methods for theme management.
 *
 * Available methods:
 * - current: Gets the current theme setting
 * - toggle: Toggles between light and dark mode
 * - dark: Sets dark mode
 * - light: Sets light mode
 * - system: Sets system-dependent theme mode
 */

import {
  THEME_MODE_CURRENT_CHANNEL,
  THEME_MODE_DARK_CHANNEL,
  THEME_MODE_LIGHT_CHANNEL,
  THEME_MODE_SYSTEM_CHANNEL,
  THEME_MODE_TOGGLE_CHANNEL,
} from "./theme-channels";

/**
 * Exposes theme-related methods to the renderer process via contextBridge
 *
 * @returns void
 */
export function exposeThemeContext(): void {
  const { contextBridge, ipcRenderer } = window.require("electron");

  // Create the themeMode object with methods that invoke IPC channels
  contextBridge.exposeInMainWorld("themeMode", {
    current: () => ipcRenderer.invoke(THEME_MODE_CURRENT_CHANNEL),
    toggle: () => ipcRenderer.invoke(THEME_MODE_TOGGLE_CHANNEL),
    dark: () => ipcRenderer.invoke(THEME_MODE_DARK_CHANNEL),
    light: () => ipcRenderer.invoke(THEME_MODE_LIGHT_CHANNEL),
    system: () => ipcRenderer.invoke(THEME_MODE_SYSTEM_CHANNEL),
  });
}
