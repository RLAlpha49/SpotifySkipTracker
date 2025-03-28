/**
 * OAuth Authentication Window Management Module
 *
 * This module handles the creation, configuration, and lifecycle management of
 * specialized browser windows for the Spotify OAuth authentication flow. It ensures
 * a secure, consistent, and user-friendly authentication experience by providing
 * a dedicated window interface for users to authenticate with Spotify.
 *
 * Features:
 * - Secure window creation with proper parent-child relationships
 * - Comprehensive security settings (no Node integration, context isolation)
 * - Modal dialog behavior to maintain authentication flow focus
 * - Seamless lifecycle management with automatic cleanup
 * - Event-driven architecture for handling all window states
 * - Error recovery for network failures and rendering issues
 * - Resource leak prevention with proper disposal
 * - Visual consistency with appropriate sizing and styling
 *
 * The window management system ensures:
 * 1. Only one authentication window can exist at a time
 * 2. All window resources are properly cleaned up after use
 * 3. Window behavior follows platform-specific conventions
 * 4. Authentication flow remains secure by isolating content
 * 5. User experience is optimized with appropriate loading behaviors
 *
 * This module is closely integrated with the OAuth flow and authentication
 * server components to provide a complete authentication solution.
 *
 * @module AuthenticationWindowManager
 */

import { BrowserWindow } from "electron";
import { saveLog } from "../../helpers/storage/store";

// Authentication window tracking
let authWindow: BrowserWindow | null = null;

/**
 * Creates and displays a browser window for OAuth authentication
 *
 * Creates a modal browser window for the Spotify OAuth flow with:
 * - Proper parent-child relationship with the main application window
 * - Secure web configuration (no node integration, context isolation)
 * - Automatic event handlers for window lifecycle events
 * - Appropriate size and styling for authentication forms
 * - Modal behavior to ensure authentication focus
 *
 * The window is created hidden first, then shown once content has loaded
 * to provide a smoother user experience. Event handlers manage the complete
 * window lifecycle, including error scenarios and cleanup.
 *
 * @param parentWindow - Parent application window that owns this authentication dialog
 * @param url - Spotify authorization URL to load in the window
 * @param onClose - Callback function to execute when window is closed
 * @returns The created BrowserWindow instance for further customization if needed
 *
 * @example
 * // Create authentication window from main application window
 * const authWindow = createAuthWindow(
 *   mainWindow,
 *   'https://accounts.spotify.com/authorize?client_id=...',
 *   () => console.log('Auth window was closed')
 * );
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
 *
 * Safely closes the authentication window and cleans up resources,
 * handling any errors that might occur during window closure.
 * This function is idempotent and can be called multiple times
 * without error, even if the window is already closed.
 *
 * @example
 * // Close the authentication window when tokens are received
 * closeAuthWindow();
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
 * Determines whether an authentication flow is in progress by
 * checking if the window exists and has not been destroyed.
 * This can be used to prevent starting multiple authentication
 * flows simultaneously.
 *
 * @returns True if an authentication window exists and is open
 *
 * @example
 * // Only start auth if no window is already open
 * if (!hasActiveAuthWindow()) {
 *   startAuthFlow();
 * }
 */
export function hasActiveAuthWindow(): boolean {
  return authWindow !== null && !authWindow.isDestroyed();
}
