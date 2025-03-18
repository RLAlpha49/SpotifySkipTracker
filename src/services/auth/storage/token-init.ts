/**
 * Token store initialization
 *
 * Handles loading tokens from startup and initializing the token store.
 */

import { saveLog } from "../../../helpers/storage/logs-store";
import * as spotifyApi from "../../spotify";
import { AuthTokens } from "@/types/auth";
import {
  getAccessTokenState,
  getRefreshTokenState,
  getTokenExpiryState,
  setAccessTokenState,
  setRefreshTokenState,
  setTokenExpiryState,
  REFRESH_MARGIN,
} from "./token-state";
import { initTokenRefresh } from "./token-refresh";

// Import setTokens directly to avoid circular dependency
let setTokens: (tokens: AuthTokens) => void = null as unknown as (
  tokens: AuthTokens,
) => void;

/**
 * Initializes the token store, loading tokens from persistent storage
 * and scheduling refresh if needed
 */
export async function initTokenStore(): Promise<void> {
  try {
    const tokenOperations = await import("./token-operations");
    setTokens = tokenOperations.setTokens;

    const tokenRefresh = await import("./token-refresh");
    const { refreshAccessToken, scheduleTokenRefresh } = tokenRefresh;

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
