/**
 * Theme IPC channel constants
 *
 * Defines IPC channel names used for theme-related communication
 * between main and renderer processes. Used consistently in both
 * the listeners (main process) and the context bridge (preload).
 */

/**
 * Channel for retrieving current theme mode
 */
export const THEME_MODE_CURRENT_CHANNEL = "theme-mode:current";

/**
 * Channel for toggling between light and dark modes
 */
export const THEME_MODE_TOGGLE_CHANNEL = "theme-mode:toggle";

/**
 * Channel for setting dark mode
 */
export const THEME_MODE_DARK_CHANNEL = "theme-mode:dark";

/**
 * Channel for setting light mode
 */
export const THEME_MODE_LIGHT_CHANNEL = "theme-mode:light";

/**
 * Channel for setting system theme mode
 */
export const THEME_MODE_SYSTEM_CHANNEL = "theme-mode:system";
