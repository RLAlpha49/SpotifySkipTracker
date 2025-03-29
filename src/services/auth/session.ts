/**
 * @packageDocumentation
 * @module auth/session
 * @description OAuth Session Management Module
 *
 * This module handles browser session data related to Spotify authentication,
 * providing specialized functionality for managing cookies, local storage, and
 * other persistence mechanisms that affect the authentication state and user
 * identity within the application.
 *
 * Features:
 * - Targeted cookie management across all Spotify authentication domains
 * - Comprehensive browser storage cleanup (localStorage, indexedDB, etc.)
 * - Forced account selection support for multi-user environments
 * - Granular control over specific authentication persistence artifacts
 * - Complete session isolation between authentication attempts
 * - Secure handling of sensitive authentication identifiers
 * - Detailed logging of session management operations
 *
 * The session management functionality is particularly important for:
 * 1. Supporting multiple Spotify accounts on a single device
 * 2. Implementing "switch account" functionality without full application restart
 * 3. Troubleshooting authentication-related issues
 * 4. Ensuring clean logout for security purposes
 * 5. Clearing stale authentication data that may cause login problems
 *
 * This module works with Electron's session API to provide precise control
 * over the browser environment used during the OAuth authentication process,
 * ensuring consistent and predictable authentication behavior regardless of
 * previous session state.
 *
 * @module AuthenticationSessionManager
 */

import { session } from "electron";
import { saveLog } from "../../helpers/storage/logs-store";

// Spotify domains that may have cookies related to authentication
const SPOTIFY_DOMAINS = [
  "accounts.spotify.com",
  "spotify.com",
  "api.spotify.com",
  ".spotify.com",
];

// Spotify cookie names that should be cleared
const SPOTIFY_COOKIES = [
  "sp_dc",
  "sp_key",
  "sp_t",
  "__Host-device_id",
  "sp_landing",
  "sp_m",
  "sp_new",
  "remember",
];

/**
 * Clears all cookies and storage data related to Spotify authentication
 *
 * Performs a thorough cleaning of browser session data by:
 * 1. Removing all Spotify-specific cookies across relevant domains
 * 2. Clearing all storage types (localStorage, indexedDB, etc.)
 * 3. Ensuring complete session state reset
 *
 * This function is particularly important when:
 * - Implementing "Log in with a different account" functionality
 * - Ensuring complete logout for security purposes
 * - Resolving authentication issues caused by stale session data
 * - Forcing the Spotify account selection screen to appear
 *
 * The function handles errors gracefully and logs all actions
 * for debugging purposes.
 *
 * @returns Promise that resolves when all cookies and storage are cleared
 *
 * @example
 * // Force account selection by clearing existing auth data
 * await clearSpotifyAuthData();
 * startAuthFlow(mainWindow, clientId, clientSecret, redirectUri, true);
 * @source
 */
export async function clearSpotifyAuthData(): Promise<void> {
  try {
    saveLog(
      "Clearing Spotify authentication cookies and storage data",
      "DEBUG",
    );

    // Remove all Spotify cookies for each domain
    for (const domain of SPOTIFY_DOMAINS) {
      for (const cookieName of SPOTIFY_COOKIES) {
        try {
          await session.defaultSession.cookies.remove(
            `https://${domain}`,
            cookieName,
          );
        } catch {
          // Ignore errors for cookies that don't exist
        }
      }
    }

    // Clear all storage data for Spotify domains
    await session.defaultSession.clearStorageData({
      origin: `https://accounts.spotify.com`,
      storages: [
        "cookies",
        "filesystem",
        "indexdb",
        "localstorage",
        "shadercache",
        "websql",
        "serviceworkers",
        "cachestorage",
      ],
    });

    saveLog("Successfully cleared Spotify authentication data", "DEBUG");
  } catch (error) {
    saveLog(`Error clearing Spotify auth data: ${error}`, "ERROR");
  }
}
