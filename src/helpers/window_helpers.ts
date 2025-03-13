/**
 * Window control module
 *
 * Provides wrapper functions around Electron window control functionality.
 * These functions communicate with the main Electron process via IPC
 * to control the application window state.
 */

/**
 * Minimizes the application window
 *
 * @returns Promise that resolves when window is minimized
 */
export async function minimizeWindow(): Promise<void> {
  await window.electronWindow.minimize();
}

/**
 * Maximizes or restores the application window
 * Toggles between maximized and previous state
 *
 * @returns Promise that resolves when window state is changed
 */
export async function maximizeWindow(): Promise<void> {
  await window.electronWindow.maximize();
}

/**
 * Closes the application window
 *
 * @returns Promise that resolves when window close is initiated
 */
export async function closeWindow(): Promise<void> {
  await window.electronWindow.close();
}
