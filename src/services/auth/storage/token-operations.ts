/**
 * Token Operations Service Module
 *
 * Provides core token management operations including storage, retrieval,
 * validation, and lifecycle management for Spotify authentication tokens.
 *
 * Features:
 * - Secure token storage in both memory and encrypted persistent storage
 * - Token retrieval with memory/storage fallback strategy
 * - Automatic token refresh scheduling
 * - Token validity checking and expiration handling
 * - Secure token clearing during logout
 * - Coordination with Spotify API for token synchronization
 * - Comprehensive error handling and logging
 * - Circular dependency resolution through function injection
 *
 * This module serves as the primary implementation for token-related
 * operations that are exposed through the auth module's public API.
 * It implements a dual storage strategy with memory state for performance
 * and encrypted persistent storage for reliability across app restarts.
 */

import { AuthTokens } from "@/types/auth";
import { saveLog } from "../../../helpers/storage/logs-store";
import * as tokenStorage from "../../../helpers/storage/token-store";
import {
  clearTokens as clearEncryptedTokens,
  saveTokens as saveEncryptedTokens,
} from "../../../helpers/storage/token-store";
import * as spotifyApi from "../../spotify";
import {
  clearTokenState,
  getAccessTokenState,
  getRefreshTokenState,
  getTokenExpiryState,
  setAccessTokenState,
  setRefreshTokenState,
  setTokenExpiryState,
} from "./token-state";

// Function to schedule token refresh - will be set by token-refresh module
let scheduleTokenRefreshFn: ((expiresIn: number) => void) | null = null;

/**
 * Sets the function to schedule token refresh
 *
 * Implements a dependency injection pattern to break circular dependencies
 * between the token operations and token refresh modules. Allows the
 * token-refresh module to provide its scheduling function without
 * creating a direct import dependency.
 *
 * This approach maintains separation of concerns while enabling proper
 * coordination between token storage and token refresh scheduling.
 *
 * @param fn - The function to schedule token refresh
 *
 * @example
 * // In token-refresh.ts
 * import { setScheduleTokenRefreshFunction } from "./token-operations";
 *
 * function scheduleRefresh(expiresIn: number) {
 *   // Implementation details...
 * }
 *
 * // Register the function
 * setScheduleTokenRefreshFunction(scheduleRefresh);
 */
export function setScheduleTokenRefreshFunction(
  fn: (expiresIn: number) => void,
): void {
  scheduleTokenRefreshFn = fn;
}

/**
 * Sets authentication tokens and stores them
 *
 * Implements comprehensive token storage by:
 * 1. Calculating the exact expiry timestamp for future validation
 * 2. Storing tokens in memory for fastest access
 * 3. Persisting tokens in encrypted storage for restarts
 * 4. Synchronizing token state with the Spotify API module
 * 5. Scheduling automatic token refresh before expiry
 *
 * This function serves as the single source of truth for setting tokens
 * across the entire application, ensuring consistent state in all token
 * storage locations.
 *
 * @param tokens - Complete set of authentication tokens to store
 *
 * @example
 * // After receiving tokens from OAuth flow
 * setTokens({
 *   accessToken: "new-spotify-access-token",
 *   refreshToken: "new-spotify-refresh-token",
 *   expiresIn: 3600
 * });
 */
export function setTokens(tokens: AuthTokens): void {
  try {
    const { accessToken, refreshToken, expiresIn } = tokens;

    // Calculate expiry timestamp (current time + expires_in duration in seconds)
    const expiryTimestamp = Date.now() + expiresIn * 1000;

    // Store in memory
    setAccessTokenState(accessToken);
    setRefreshTokenState(refreshToken);
    setTokenExpiryState(expiryTimestamp);

    // Store in encrypted persistent storage
    saveEncryptedTokens({
      accessToken,
      refreshToken,
      expiresAt: expiryTimestamp,
    });

    // Set tokens in spotify API module for compatibility
    spotifyApi.setTokens(accessToken, refreshToken, expiresIn);

    // Schedule token refresh if function is set
    if (scheduleTokenRefreshFn) {
      scheduleTokenRefreshFn(expiresIn);
    }

    saveLog("Authentication tokens stored successfully", "DEBUG");
  } catch (error) {
    saveLog(`Failed to store authentication tokens: ${error}`, "ERROR");
  }
}

/**
 * Clears all stored authentication tokens
 *
 * Completely removes all authentication tokens from every storage
 * location in the application, implementing a thorough logout process:
 * 1. Clears in-memory token state
 * 2. Removes tokens from encrypted persistent storage
 * 3. Clears tokens from the Spotify API module
 *
 * This function ensures no token information remains after logout,
 * providing proper security and state management.
 *
 * @example
 * // During user logout
 * clearTokens();
 * showLoginScreen();
 */
export function clearTokens(): void {
  try {
    // Clear memory
    clearTokenState();

    // Clear encrypted persistent storage
    clearEncryptedTokens();

    // Clear spotify API module tokens
    spotifyApi.clearTokens();

    saveLog("Authentication tokens cleared", "DEBUG");
  } catch (error) {
    saveLog(`Failed to clear authentication tokens: ${error}`, "ERROR");
  }
}

/**
 * Gets the current access token
 *
 * Retrieves the access token using a two-tier strategy:
 * 1. First attempts to get token from fast in-memory state
 * 2. Falls back to encrypted storage if not in memory
 * 3. When loading from storage, rehydrates memory state
 *
 * This approach balances performance (memory access) with
 * reliability (persistent storage fallback), ensuring token
 * availability even after application restarts.
 *
 * @returns Current access token or null if not authenticated
 *
 * @example
 * // Before making an API request
 * const token = getAccessToken();
 * if (token) {
 *   headers.Authorization = `Bearer ${token}`;
 * } else {
 *   // Handle unauthenticated state
 * }
 */
export function getAccessToken(): string | null {
  const accessToken = getAccessTokenState();
  if (accessToken) return accessToken;

  // If not in memory, try loading from encrypted storage
  const tokens = tokenStorage.loadTokens();
  if (tokens) {
    // Update memory state with loaded tokens
    setAccessTokenState(tokens.accessToken);
    setRefreshTokenState(tokens.refreshToken);
    setTokenExpiryState(tokens.expiresAt);
    return tokens.accessToken;
  }

  return null;
}

/**
 * Gets the current refresh token
 *
 * Retrieves the refresh token using a two-tier strategy:
 * 1. First attempts to get token from fast in-memory state
 * 2. Falls back to encrypted storage if not in memory
 * 3. When loading from storage, rehydrates memory state
 *
 * The refresh token is critical for maintaining long-term
 * authentication by obtaining new access tokens when they expire.
 *
 * @returns Current refresh token or null if not authenticated
 *
 * @example
 * // Before attempting token refresh
 * const refreshToken = getRefreshToken();
 * if (refreshToken) {
 *   // Proceed with token refresh
 * } else {
 *   // Cannot refresh, require re-authentication
 * }
 */
export function getRefreshToken(): string | null {
  const refreshToken = getRefreshTokenState();
  if (refreshToken) return refreshToken;

  // If not in memory, try loading from encrypted storage
  const tokens = tokenStorage.loadTokens();
  if (tokens) {
    // Update memory state with loaded tokens
    setAccessTokenState(tokens.accessToken);
    setRefreshTokenState(tokens.refreshToken);
    setTokenExpiryState(tokens.expiresAt);
    return tokens.refreshToken;
  }

  return null;
}

/**
 * Gets the token expiry timestamp
 *
 * Retrieves the access token expiration timestamp using a two-tier strategy:
 * 1. First attempts to get expiry from fast in-memory state
 * 2. Falls back to encrypted storage if not in memory
 * 3. When loading from storage, rehydrates memory state
 *
 * The expiry timestamp is used to determine when to refresh tokens
 * and whether the current access token is still valid.
 *
 * @returns Timestamp when the token expires (milliseconds since epoch) or null
 *
 * @example
 * // Check if token needs refresh
 * const expiryTime = getTokenExpiry();
 * if (expiryTime) {
 *   const timeRemaining = expiryTime - Date.now();
 *   if (timeRemaining < 300000) { // Less than 5 minutes
 *     // Token expires soon, refresh it
 *   }
 * }
 */
export function getTokenExpiry(): number | null {
  const expiry = getTokenExpiryState();
  if (expiry) return expiry;

  // If not in memory, try loading from encrypted storage
  const tokens = tokenStorage.loadTokens();
  if (tokens) {
    // Update memory state with loaded tokens
    setAccessTokenState(tokens.accessToken);
    setRefreshTokenState(tokens.refreshToken);
    setTokenExpiryState(tokens.expiresAt);
    return tokens.expiresAt;
  }

  return null;
}

/**
 * Checks if the user is authenticated with valid tokens
 *
 * Performs a comprehensive authentication check that verifies:
 * 1. Both access and refresh tokens exist
 * 2. The access token has not expired
 *
 * This function serves as the definitive authority on authentication
 * status throughout the application, providing a single source of
 * truth for determining if the user can make authenticated requests.
 *
 * @returns True if authenticated with valid tokens, false otherwise
 *
 * @example
 * // Protect a feature that requires authentication
 * if (isAuthenticated()) {
 *   // Show authenticated content
 *   showUserProfile();
 * } else {
 *   // Show unauthenticated state
 *   showLoginButton();
 * }
 */
export function isAuthenticated(): boolean {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  // Check if both tokens exist
  if (!accessToken || !refreshToken) {
    return false;
  }

  // Check if token has expired
  const expiry = getTokenExpiry();
  if (expiry && expiry <= Date.now()) {
    return false;
  }

  return true;
}
