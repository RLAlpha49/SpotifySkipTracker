/**
 * Window control IPC channel constants
 *
 * Defines IPC channel names used for window control operations
 * between main and renderer processes. Used consistently in both
 * the listeners (main process) and the context bridge (preload).
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
