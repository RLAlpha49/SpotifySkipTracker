/**
 * OAuth authentication window management
 *
 * Handles the browser window for the OAuth flow, including creation,
 * lifecycle events, and cleanup.
 */

import { BrowserWindow } from "electron";
import { saveLog } from "../../helpers/storage/store";

// Authentication window tracking
let authWindow: BrowserWindow | null = null;

/**
 * Creates a browser window for OAuth authentication
 *
 * @param parentWindow Parent window that owns this authentication dialog
 * @param url URL to load in the authentication window
 * @param onClose Callback to execute when window is closed
 * @returns The created BrowserWindow instance
 */
export function createAuthWindow(
  parentWindow: BrowserWindow,
  url: string,
  onClose: () => void,
): BrowserWindow {
  // Clean up any existing window
  if (authWindow) {
    closeAuthWindow();
  }

  // Create a new authentication window
  authWindow = new BrowserWindow({
    parent: parentWindow,
    modal: true,
    width: 500,
    height: 700,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Configure window properties
  authWindow.setMenu(null);
  authWindow.setTitle("Spotify Authentication");

  // Set up event handlers
  authWindow.once("ready-to-show", () => {
    if (authWindow) {
      authWindow.show();
      saveLog("OAuth authentication window displayed", "DEBUG");
    }
  });

  authWindow.webContents.on(
    "did-fail-load",
    (_, errorCode, errorDescription) => {
      saveLog(
        `Authentication page failed to load: ${errorDescription} (${errorCode})`,
        "ERROR",
      );
      closeAuthWindow();
      onClose();
    },
  );

  authWindow.on("closed", () => {
    authWindow = null;
    onClose();
  });

  // Load the authorization URL
  authWindow.loadURL(url);
  saveLog(`OAuth window created and loading URL: ${url}`, "DEBUG");

  return authWindow;
}

/**
 * Closes the authentication window if it exists
 */
export function closeAuthWindow(): void {
  if (authWindow) {
    try {
      authWindow.close();
      saveLog("OAuth authentication window closed", "DEBUG");
    } catch (error) {
      saveLog(`Error closing OAuth window: ${error}`, "WARNING");
    } finally {
      authWindow = null;
    }
  }
}

/**
 * Checks if an authentication window is currently open
 *
 * @returns True if an authentication window exists and is open
 */
export function hasActiveAuthWindow(): boolean {
  return authWindow !== null && !authWindow.isDestroyed();
}
