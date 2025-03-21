/**
 * Token refresh service
 *
 * Handles refreshing expired tokens and scheduling token refreshes.
 */

import { saveLog } from "../../../helpers/storage/logs-store";
import * as spotifyApi from "../../spotify";
import { AuthTokens } from "@/types/auth";
import {
  clearRefreshTimer,
  getRefreshTokenState,
  setRefreshTimer,
  REFRESH_MARGIN,
} from "./token-state";

// The function reference to avoid circular dependency
let setTokensFunction: ((tokens: AuthTokens) => void) | null = null;
let scheduleTokenRefreshFnRegistered = false;

/**
 * Sets the reference to the setTokens function to avoid circular dependency
 *
 * @param setTokensFn The setTokens function
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
 * @param expiresIn Seconds until the token expires
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
 * @returns Promise resolving to true if refresh was successful
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
