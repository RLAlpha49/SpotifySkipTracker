/**
 * @packageDocumentation
 * @module window_helpers
 * @description Application Window Management System
 *
 * Provides a clean, cross-platform interface for controlling the application window
 * state through secure IPC communication with the Electron main process.
 *
 * This module abstracts platform-specific window behavior complexities behind
 * a simple API, allowing the application to provide consistent window controls
 * across operating systems while maintaining proper process isolation.
 *
 * Supported operations:
 * - Window minimization (iconify)
 * - Window maximization and restoration
 * - Window closing with proper application lifecycle management
 *
 * Each operation is implemented through asynchronous IPC calls to ensure
 * the renderer process never gains direct access to native window controls,
 * maintaining Electron's security model while providing the necessary functionality.
 */

/**
 * Minimizes the application window
 *
 * @returns Promise that resolves when window is minimized
 * @source
 */
export async function minimizeWindow(): Promise<void> {
  await window.electronWindow.minimize();
}

/**
 * Maximizes or restores the application window
 * Toggles between maximized and previous state
 *
 * @returns Promise that resolves when window state is changed
 * @source
 */
export async function maximizeWindow(): Promise<void> {
  await window.electronWindow.maximize();
}

/**
 * Closes the application window
 *
 * @returns Promise that resolves when window close is initiated
 * @source
 */
export async function closeWindow(): Promise<void> {
  await window.electronWindow.close();
}
