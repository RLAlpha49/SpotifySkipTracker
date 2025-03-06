/**
 * Theme Context Exposer
 *
 * This module exposes theme-related functionality to the renderer process
 * through Electron's contextBridge. It creates a 'themeMode' object in the
 * window global scope that provides methods for:
 *
 * - Getting the current theme mode
 * - Toggling between light and dark mode
 * - Setting specific theme modes (dark, light, system)
 *
 * Each method communicates with the main process via IPC to perform
 * the actual theme changes using Electron's nativeTheme API.
 */

import {
  THEME_MODE_CURRENT_CHANNEL,
  THEME_MODE_DARK_CHANNEL,
  THEME_MODE_LIGHT_CHANNEL,
  THEME_MODE_SYSTEM_CHANNEL,
  THEME_MODE_TOGGLE_CHANNEL,
} from "./theme-channels";

/**
 * Expose theme-related methods to the renderer process
 * This function is called from the preload script
 */
export function exposeThemeContext() {
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
