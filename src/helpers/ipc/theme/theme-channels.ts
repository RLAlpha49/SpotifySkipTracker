/**
 * @packageDocumentation
 * @module theme-channels
 * @description Theme Management IPC Channel Constants
 *
 * Defines standardized channel identifiers for theme control operations
 * in the Electron IPC communication system.
 *
 * These constants establish a clear communication contract between processes
 * for all theme-related operations. The consistent naming scheme follows the
 * 'theme-mode:action' pattern, providing a self-documenting API structure.
 *
 * Benefits of this centralized definition approach:
 * - Single source of truth for channel names
 * - Consistent naming patterns across the codebase
 * - Type safety through string constants
 * - Clear separation between different theme operations
 * - Easy addition of new theme-related channels
 *
 * These channels connect the theme-listeners.ts module (main process) with
 * the theme-context.ts module (preload script) to provide secure theme
 * management capabilities to the renderer process.
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
