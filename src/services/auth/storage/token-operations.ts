/**
 * Token operations service
 *
 * Provides the main interface for token management operations.
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
 * This is called by the token-refresh module to avoid circular dependencies
 *
 * @param fn The function to schedule token refresh
 */
export function setScheduleTokenRefreshFunction(
  fn: (expiresIn: number) => void,
): void {
  scheduleTokenRefreshFn = fn;
}

/**
 * Sets authentication tokens and stores them
 *
 * @param tokens Authentication tokens to store
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
 * @returns Current access token or null if not authenticated
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
 * @returns Current refresh token or null if not authenticated
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
 * @returns Timestamp when the token expires or null if not authenticated
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
 * @returns True if authenticated with valid tokens, false otherwise
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
