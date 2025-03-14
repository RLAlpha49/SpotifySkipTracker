/**
 * Token store initialization
 *
 * Handles loading tokens from startup and initializing the token store.
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
  REFRESH_MARGIN,
} from "./token-state";
import {
  refreshAccessToken,
  scheduleTokenRefresh,
  initTokenRefresh,
} from "./token-refresh";
import { setTokens } from "./token-operations";

/**
 * Initializes the token store, loading tokens from persistent storage
 * and scheduling refresh if needed
 */
export function initTokenStore(): void {
  try {
    // First initialize the token refresh system
    initTokenRefresh(setTokens);

    // Get token state from storage/memory
    const accessToken = getAccessTokenState();
    const refreshToken = getRefreshTokenState();
    const tokenExpiryTimestamp = getTokenExpiryState();

    // Ensure state is properly loaded in memory first
    setAccessTokenState(accessToken);
    setRefreshTokenState(refreshToken);
    setTokenExpiryState(tokenExpiryTimestamp);

    // If we have valid tokens, set them up
    if (accessToken && refreshToken && tokenExpiryTimestamp) {
      const now = Date.now();
      const expiresIn = Math.max(0, (tokenExpiryTimestamp - now) / 1000);

      // Set tokens in spotify API module for compatibility
      spotifyApi.setTokens(accessToken, refreshToken, Math.floor(expiresIn));

      // Only refresh if token is expired or about to expire (within refresh margin)
      if (expiresIn <= REFRESH_MARGIN) {
        saveLog(
          "Stored token expired or about to expire, attempting refresh",
          "DEBUG",
        );
        refreshAccessToken();
      } else {
        // Token is still valid, schedule refresh for when it's about to expire
        const timeUntilRefresh = expiresIn - REFRESH_MARGIN;
        saveLog(
          `Token valid for ${Math.floor(expiresIn)} seconds, scheduling refresh in ${Math.floor(timeUntilRefresh)} seconds`,
          "DEBUG",
        );
        scheduleTokenRefresh(timeUntilRefresh);
      }
    }

    saveLog("Token store initialized", "DEBUG");
  } catch (error) {
    saveLog(`Error initializing token store: ${error}`, "ERROR");
  }
}
