/**
 * Theme IPC Channel Constants
 *
 * This file defines the IPC channel names used for theme-related communication
 * between the main and renderer processes. These constants are used in both
 * the listeners (main process) and context exposer (preload script).
 *
 * Using constants ensures consistency and prevents typos in channel names.
 */

// Channel for getting the current theme mode
export const THEME_MODE_CURRENT_CHANNEL = "theme-mode:current";

// Channel for toggling between light and dark mode
export const THEME_MODE_TOGGLE_CHANNEL = "theme-mode:toggle";

// Channel for setting dark mode
export const THEME_MODE_DARK_CHANNEL = "theme-mode:dark";

// Channel for setting light mode
export const THEME_MODE_LIGHT_CHANNEL = "theme-mode:light";

// Channel for setting system theme mode
export const THEME_MODE_SYSTEM_CHANNEL = "theme-mode:system";
