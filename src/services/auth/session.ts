/**
 * OAuth session management
 *
 * Handles browser session data, cookies, and storage for Spotify authentication.
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
 * @returns Promise that resolves when cookies and storage are cleared
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
