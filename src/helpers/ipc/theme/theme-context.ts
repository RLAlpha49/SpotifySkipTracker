/**
 * Theme Management Context Bridge
 *
 * Securely exposes theme control functionality to the renderer process through
 * Electron's contextBridge API, maintaining proper process isolation.
 *
 * This module creates a controlled, secure API surface that allows the web-based
 * renderer to access theme capabilities without compromising security. The exposed
 * 'themeMode' global object provides a comprehensive interface for theme management
 * while preventing direct access to Node.js APIs.
 *
 * The exposed API enables the renderer to:
 * - Detect the current theme setting (dark/light/system)
 * - Toggle between light and dark modes directly
 * - Force specific theme modes regardless of system settings
 * - Synchronize with the system's theme preference
 *
 * Each method communicates through predefined IPC channels, creating a
 * secure boundary between renderer and main processes while enabling
 * seamless theme integration.
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
