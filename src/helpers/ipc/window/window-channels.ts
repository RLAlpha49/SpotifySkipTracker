/**
 * Window Control IPC Channel Constants
 *
 * This file defines the IPC channel names used for window control operations
 * between the main and renderer processes. These constants are used in both
 * the listeners (main process) and context exposer (preload script).
 *
 * Using constants ensures consistency and prevents typos in channel names.
 */

// Channel for minimizing the application window
export const WINDOW_MINIMIZE_CHANNEL = "window:minimize";

// Channel for maximizing or restoring the application window
export const WINDOW_MAXIMIZE_CHANNEL = "window:maximize";

// Channel for closing the application window
export const WINDOW_CLOSE_CHANNEL = "window:close";
