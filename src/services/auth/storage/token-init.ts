/**
 * Token store initialization
 *
 * Handles loading tokens on startup and initializing the token store.
 */

import { saveLog } from "../../../helpers/storage/logs-store";
import * as spotifyApi from "../../spotify";
import {
  getAccessTokenState,
  getRefreshTokenState,
  getTokenExpiryState,
  setAccessTokenState,
  setRefreshTokenState,
  setTokenExpiryState,
} from "./token-state";
import { refreshAccessToken, scheduleTokenRefresh } from "./token-refresh";

/**
 * Initializes the token store, loading tokens from persistent storage
 * and scheduling refresh if needed
 */
export function initTokenStore(): void {
  try {
    // Get token state from storage/memory
    const accessToken = getAccessTokenState();
    const refreshToken = getRefreshTokenState();
    const tokenExpiryTimestamp = getTokenExpiryState();

    // Ensure state is properly loaded in memory
    setAccessTokenState(accessToken);
    setRefreshTokenState(refreshToken);
    setTokenExpiryState(tokenExpiryTimestamp);

    // Also set them in the spotify-api module for compatibility
    if (accessToken && refreshToken && tokenExpiryTimestamp) {
      const now = Date.now();
      const expiresIn = Math.max(0, (tokenExpiryTimestamp - now) / 1000);

      // Set tokens in spotify API module
      spotifyApi.setTokens(accessToken, refreshToken, Math.floor(expiresIn));

      if (expiresIn <= 0) {
        // Token already expired, attempt immediate refresh
        saveLog("Stored token expired, attempting refresh", "DEBUG");
        refreshAccessToken();
      } else {
        // Token still valid, schedule refresh
        scheduleTokenRefresh(expiresIn);
      }
    }

    saveLog("Token store initialized", "DEBUG");
  } catch (error) {
    saveLog(`Error initializing token store: ${error}`, "ERROR");
  }
}
