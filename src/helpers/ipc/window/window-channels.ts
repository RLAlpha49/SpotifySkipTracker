/**
 * @packageDocumentation
 * @module window-channels
 * @description Window Control IPC Channel Constants
 *
 * Defines standardized channel identifiers for window management operations
 * in the Electron IPC communication system.
 *
 * These constants serve as the communication contract between the main process
 * (which controls the actual window) and the renderer process (which requests actions).
 * By centralizing these channel names in a shared module:
 *
 * - Both processes can reference identical channel names
 * - Changes to channel naming only need to be made in one place
 * - Channel naming follows a consistent pattern (window:action)
 * - Type safety is maintained across the codebase
 *
 * These channels are used by the window-listeners.ts module (main process)
 * and window-context.ts module (preload script) to establish a secure
 * communication pathway.
 */

/**
 * Channel for window minimize operation
 */
export const WINDOW_MINIMIZE_CHANNEL = "window:minimize";

/**
 * Channel for window maximize/restore operation
 */
export const WINDOW_MAXIMIZE_CHANNEL = "window:maximize";

/**
 * Channel for window close operation
 */
export const WINDOW_CLOSE_CHANNEL = "window:close";
