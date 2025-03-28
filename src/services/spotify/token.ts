/**
 * Spotify API Token Management Service
 *
 * This module provides comprehensive management of Spotify API authentication tokens,
 * handling all aspects of token lifecycle including storage, validation, retrieval,
 * and automatic refresh of expired tokens.
 *
 * Features:
 * - Secure in-memory token storage
 * - Token validation and expiry checking
 * - Access token auto-refresh using refresh tokens
 * - Token information retrieval
 * - Token state management
 * - Intelligent token refresh scheduling
 * - Comprehensive error handling for token operations
 *
 * This module works closely with the Authentication module to maintain
 * a valid authentication state throughout the application's lifecycle.
 *
 * Usage:
 * ```typescript
 * import {
 *   ensureValidToken,
 *   getAccessToken,
 *   refreshAccessToken
 * } from '@/services/spotify/token';
 *
 * // Before making API calls, ensure a valid token
 * await ensureValidToken();
 *
 * // Get the current token for API requests
 * const token = getAccessToken();
 *
 * // Manual token refresh if needed
 * await refreshAccessToken();
 * ```
 *
 * @module SpotifyTokenManagement
 */

import { SpotifyTokenRefreshResponse } from "@/types/spotify-api";
import axios from "axios";
import querystring from "querystring";
import { saveLog } from "../../helpers/storage/logs-store";
import { retryApiCall } from "../api-retry";
import { TOKEN_URL } from "./constants";
import { ensureCredentialsSet, getCredentials } from "./credentials";

// Token state
let accessToken: string | null = null;
let refreshToken: string | null = null;
let tokenExpiryTime: number = 0;

// Add a margin (in seconds) for token refresh to avoid needless refreshes
// This should match the REFRESH_MARGIN in auth/storage/token-state.ts
const TOKEN_REFRESH_MARGIN = 300;

/**
 * Checks if the current access token is valid (not expired)
 *
 * @returns true if the token is valid and not expired
 */
export function isTokenValid(): boolean {
  // Check if token exists and has not yet reached expiry time
  // Add extra check to ensure the token isn't near expiration
  const now = Date.now();
  const isValid = Boolean(
    accessToken &&
      tokenExpiryTime > now &&
      // Ensure token has at least 60 seconds before expiry to be considered valid
      tokenExpiryTime - now > 60000,
  );

  if (!isValid && accessToken) {
    saveLog(
      `Token considered invalid: ${accessToken.substring(0, 5)}...`,
      "DEBUG",
    );
  }

  return isValid;
}

/**
 * Sets the authentication tokens and calculates expiry time
 *
 * @param newAccessToken - Access token from Spotify
 * @param newRefreshToken - Refresh token from Spotify
 * @param expiresIn - Token expiry time in seconds
 */
export function setTokens(
  newAccessToken: string,
  newRefreshToken: string,
  expiresIn: number,
): void {
  accessToken = newAccessToken;
  refreshToken = newRefreshToken;
  tokenExpiryTime = Date.now() + expiresIn * 1000;

  saveLog(`Spotify tokens updated, expires in ${expiresIn} seconds`, "DEBUG");
}

/**
 * Clears all stored tokens
 */
export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  tokenExpiryTime = 0;

  saveLog("Spotify tokens cleared", "DEBUG");
}

/**
 * Gets information about the current token state
 *
 * @returns Object with token information
 */
export function getTokenInfo(): {
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  isValid: boolean;
  expiresIn: number;
} {
  const expiresInMs = Math.max(0, tokenExpiryTime - Date.now());
  return {
    hasAccessToken: Boolean(accessToken),
    hasRefreshToken: Boolean(refreshToken),
    isValid: isTokenValid(),
    expiresIn: Math.floor(expiresInMs / 1000),
  };
}

/**
 * Gets the current access token
 *
 * @returns Current access token or null if not set
 */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Gets the current refresh token
 *
 * @returns Current refresh token or null if not set
 */
export function getRefreshToken(): string | null {
  return refreshToken;
}

/**
 * Refreshes the access token using the stored refresh token
 *
 * @returns Promise resolving to token response with new access token
 * @throws Error if refresh fails or no refresh token is available
 */
export async function refreshAccessToken(): Promise<SpotifyTokenRefreshResponse> {
  ensureCredentialsSet();

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  try {
    const { clientId, clientSecret } = getCredentials();
    const response = await axios.post(
      TOKEN_URL,
      querystring.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const tokenResponse = response.data as SpotifyTokenRefreshResponse;
    const new_refresh_token = tokenResponse.refresh_token || refreshToken;

    // Update tokens
    setTokens(
      tokenResponse.access_token,
      new_refresh_token,
      tokenResponse.expires_in,
    );

    saveLog("Successfully refreshed access token", "DEBUG");
    return tokenResponse;
  } catch (error: unknown) {
    const err = error as Error;
    saveLog(`Failed to refresh access token: ${err.message}`, "ERROR");
    throw new Error(`Failed to refresh access token: ${err.message}`);
  }
}

/**
 * Ensures a valid access token is available, refreshing if necessary
 *
 * @throws Error if token refresh fails or no valid token is available
 */
export async function ensureValidToken(): Promise<void> {
  ensureCredentialsSet();

  // Only refresh if token is invalid or about to expire (within refresh margin)
  const now = Date.now();
  const tokenTimeRemaining = tokenExpiryTime - now;
  const isTokenAboutToExpire =
    tokenTimeRemaining > 0 && tokenTimeRemaining < TOKEN_REFRESH_MARGIN * 1000;

  if (
    !accessToken ||
    !tokenExpiryTime ||
    tokenExpiryTime <= now ||
    isTokenAboutToExpire
  ) {
    if (refreshToken) {
      try {
        await retryApiCall(async () => {
          await refreshAccessToken();
        }, 3);
      } catch {
        throw new Error(
          "Access token expired and refresh failed. Re-authorization required.",
        );
      }
    } else {
      throw new Error("No valid access token. Authorization required.");
    }
  }
}
