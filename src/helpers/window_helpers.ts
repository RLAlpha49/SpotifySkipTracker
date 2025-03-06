/**
 * Window Control Helpers
 *
 * This module provides simple wrappers around Electron window control functions,
 * allowing the frontend to minimize, maximize, and close the application window.
 * These functions communicate with the main Electron process via IPC.
 */

/**
 * Minimize the application window
 */
export async function minimizeWindow() {
  await window.electronWindow.minimize();
}

/**
 * Maximize or restore the application window
 */
export async function maximizeWindow() {
  await window.electronWindow.maximize();
}

/**
 * Close the application window
 */
export async function closeWindow() {
  await window.electronWindow.close();
}
