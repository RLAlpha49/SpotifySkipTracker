/**
 * Authentication Token System Initialization Module
 *
 * Handles the initial bootstrap process for the authentication token system,
 * ensuring proper loading of existing tokens and coordination between
 * various token-related modules.
 *
 * Features:
 * - One-time initialization of the token management system
 * - Automatic loading of persisted tokens during application startup
 * - Circular dependency resolution through dynamic imports
 * - Automatic token refresh for tokens near expiration
 * - Token expiry validation during initialization
 * - Automatic refresh scheduling for valid tokens
 * - Proper token state synchronization across modules
 * - Comprehensive error handling during initialization
 *
 * This module serves as the bootstrap mechanism for the token system,
 * ensuring that all token-related modules are properly initialized and
 * configured, and that any existing tokens are loaded and validated.
 * It also handles the initial token refresh scheduling based on the
 * loaded token state.
 */

import { AuthTokens } from "@/types/auth";
import { saveLog } from "../../../helpers/storage/logs-store";
import * as spotifyApi from "../../spotify";
import { initTokenRefresh } from "./token-refresh";
import {
  getAccessTokenState,
  getRefreshTokenState,
  getTokenExpiryState,
  REFRESH_MARGIN,
  setAccessTokenState,
  setRefreshTokenState,
  setTokenExpiryState,
} from "./token-state";

// Import setTokens directly to avoid circular dependency
let setTokens: (tokens: AuthTokens) => void = null as unknown as (
  tokens: AuthTokens,
) => void;

/**
 * Initializes the token store, loading tokens from persistent storage
 * and scheduling refresh if needed
 *
 * Performs the complete token system bootstrap process by:
 * 1. Dynamically importing token-related modules to resolve circular dependencies
 * 2. Initializing the token refresh system with proper setTokens reference
 * 3. Loading existing tokens from storage into memory
 * 4. Validating token expiration status and determining appropriate action
 * 5. Refreshing tokens immediately if expired or near expiration
 * 6. Scheduling future refresh for valid tokens
 * 7. Synchronizing token state with the Spotify API module
 *
 * This function should be called during application startup to ensure
 * the authentication system is properly initialized before use.
 *
 * @returns Promise that resolves when initialization is complete
 *
 * @example
 * // During application startup
 * import { initTokenStore } from "./auth/storage/token-init";
 *
 * async function startApp() {
 *   await initTokenStore();
 *   // Now authentication is ready to use
 *   if (isAuthenticated()) {
 *     showMainUI();
 *   } else {
 *     showLoginScreen();
 *   }
 * }
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
