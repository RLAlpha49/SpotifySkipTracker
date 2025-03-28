/**
 * Token Refresh Management Module
 *
 * Provides automatic access token refresh functionality for the OAuth authentication
 * system, ensuring continuous API access without requiring user re-authentication.
 *
 * Features:
 * - Proactive token refresh scheduling before expiration
 * - Automatic token refresh with error handling
 * - Configurable refresh safety margin for reliable token renewal
 * - Circular dependency resolution through dependency injection
 * - Graceful handling of refresh failures
 * - Automatic timer management with cleanup
 * - Comprehensive logging of refresh activities
 * - Integration with Spotify API for token refresh operations
 *
 * This module works in concert with the token operations and token state modules,
 * providing time-based automatic refresh of access tokens using refresh tokens,
 * which is essential for maintaining long-lived authentication sessions.
 */

import { AuthTokens } from "@/types/auth";
import { saveLog } from "../../../helpers/storage/logs-store";
import * as spotifyApi from "../../spotify";
import {
  clearRefreshTimer,
  getRefreshTokenState,
  REFRESH_MARGIN,
  setRefreshTimer,
} from "./token-state";

// The function reference to avoid circular dependency
let setTokensFunction: ((tokens: AuthTokens) => void) | null = null;
let scheduleTokenRefreshFnRegistered = false;

/**
 * Sets the reference to the setTokens function to avoid circular dependency
 *
 * Implements a dependency injection pattern to resolve circular dependencies
 * between the token refresh and token operations modules. This function
 * must be called during token system initialization before token refresh
 * operations can be performed.
 *
 * Additionally, this function registers the scheduleTokenRefresh function
 * with the token-operations module, creating a bidirectional relationship
 * without direct cyclic imports.
 *
 * @param setTokensFn The function to use for storing tokens after refresh
 *
 * @example
 * // During token system initialization
 * import { setTokens } from "./token-operations";
 * initTokenRefresh(setTokens);
 */
export function initTokenRefresh(
  setTokensFn: (tokens: AuthTokens) => void,
): void {
  setTokensFunction = setTokensFn;

  // Register the scheduleTokenRefresh function with token-operations if not already done
  if (!scheduleTokenRefreshFnRegistered) {
    scheduleTokenRefreshFnRegistered = true;
    import("./token-operations").then(({ setScheduleTokenRefreshFunction }) => {
      setScheduleTokenRefreshFunction(scheduleTokenRefresh);
    });
  }
}

/**
 * Schedules a token refresh before the current token expires
 *
 * Sets up an automatic refresh operation that will execute shortly before
 * the current access token expires. The exact timing is controlled by
 * the REFRESH_MARGIN constant, which ensures the token is refreshed with
 * sufficient time to prevent any authentication gaps.
 *
 * This function:
 * 1. Clears any existing refresh timer to prevent multiple refreshes
 * 2. Calculates the optimal time to refresh (token expiry - safety margin)
 * 3. Sets up a timer to execute the refresh at the calculated time
 * 4. Stores the timer reference for future management
 *
 * @param expiresIn Number of seconds until the current token expires
 *
 * @example
 * // Schedule a refresh for a token with 1 hour validity
 * scheduleTokenRefresh(3600);
 *
 * // This will automatically refresh the token 5 minutes before expiry
 * // (assuming REFRESH_MARGIN is set to 300 seconds)
 */
export function scheduleTokenRefresh(expiresIn: number): void {
  // Clear any existing timer
  clearRefreshTimer();

  // Calculate refresh time (token expiry - safety margin)
  const refreshTime = Math.max(0, expiresIn - REFRESH_MARGIN) * 1000;

  // Schedule refresh
  const timer = setTimeout(refreshAccessToken, refreshTime);
  setRefreshTimer(timer);

  saveLog(`Token refresh scheduled in ${refreshTime / 1000} seconds`, "DEBUG");
}

/**
 * Refreshes the access token using the refresh token
 *
 * Performs the complete token refresh operation by:
 * 1. Retrieving the current refresh token
 * 2. Exchanging it with Spotify for a new access token
 * 3. Storing the updated tokens
 * 4. Scheduling the next refresh based on the new expiry
 *
 * This function handles error conditions gracefully and includes fallback
 * initialization if called before the token system is fully initialized,
 * making it robust against various calling patterns.
 *
 * @returns Promise resolving to true if refresh was successful, false otherwise
 *
 * @example
 * // Manually refresh token when needed
 * try {
 *   const success = await refreshAccessToken();
 *   if (success) {
 *     console.log("Successfully refreshed access token");
 *     performApiRequest();
 *   } else {
 *     console.error("Failed to refresh token");
 *     showLoginPrompt();
 *   }
 * } catch (error) {
 *   handleError(error);
 * }
 */
export async function refreshAccessToken(): Promise<boolean> {
  try {
    const refreshToken = getRefreshTokenState();
    if (!refreshToken) {
      saveLog("Cannot refresh token: No refresh token available", "WARNING");
      return false;
    }

    saveLog("Refreshing access token", "DEBUG");

    // Ensure the token refresh setTokens function is initialized
    if (!setTokensFunction) {
      saveLog(
        "Token refresh system not initialized, initializing now",
        "WARNING",
      );
      // Add a fallback to the main token refresh function if not initialized
      initTokenRefresh((tokens) => {
        try {
          import("./token-operations")
            .then(({ setTokens: setTokensOp }) => {
              if (setTokensOp) {
                setTokensOp(tokens);
              } else {
                saveLog(
                  "Failed to initialize fallback token refresh mechanism",
                  "ERROR",
                );
              }
            })
            .catch(() => {
              saveLog(`Error initializing fallback token refresh`, "ERROR");
            });
        } catch {
          saveLog(`Error initializing fallback token refresh`, "ERROR");
        }
      });
    }

    // Perform token refresh using the spotify-api module
    const response = await spotifyApi.refreshAccessToken();

    // Store new tokens (refreshed tokens don't include a new refresh token)
    const tokens: AuthTokens = {
      accessToken: response.access_token,
      refreshToken: refreshToken, // Use existing refresh token
      expiresIn: response.expires_in,
    };

    // Update stored tokens
    if (setTokensFunction) {
      setTokensFunction(tokens);
    } else {
      saveLog(
        "Cannot save refreshed tokens: setTokens function not initialized",
        "ERROR",
      );
      return false;
    }

    saveLog("Successfully refreshed access token", "DEBUG");
    return true;
  } catch (error) {
    saveLog(`Failed to refresh access token: ${error}`, "ERROR");
    return false;
  }
}
