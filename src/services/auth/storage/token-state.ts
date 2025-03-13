/**
 * Token state management
 *
 * Manages the in-memory state of authentication tokens.
 */

import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  TOKEN_EXPIRY_KEY,
  retrieveTokenValue,
} from "./token-storage";

// Current token state
let currentAccessToken: string | null = null;
let currentRefreshToken: string | null = null;
let tokenExpiryTimestamp: number | null = null;
let refreshTimer: NodeJS.Timeout | null = null;

// Refresh safety margin (in seconds) - refresh 5 minutes before expiry
export const REFRESH_MARGIN = 300;

/**
 * Gets or initializes the access token from memory or storage
 *
 * @returns The current access token or null if not available
 */
export function getAccessTokenState(): string | null {
  if (currentAccessToken) {
    return currentAccessToken;
  }

  // Try to load from persistent storage
  return retrieveTokenValue<string>(ACCESS_TOKEN_KEY);
}

/**
 * Gets or initializes the refresh token from memory or storage
 *
 * @returns The current refresh token or null if not available
 */
export function getRefreshTokenState(): string | null {
  if (currentRefreshToken) {
    return currentRefreshToken;
  }

  // Try to load from persistent storage
  return retrieveTokenValue<string>(REFRESH_TOKEN_KEY);
}

/**
 * Gets or initializes the token expiry timestamp from memory or storage
 *
 * @returns The token expiry timestamp or null if not available
 */
export function getTokenExpiryState(): number | null {
  if (tokenExpiryTimestamp) {
    return tokenExpiryTimestamp;
  }

  // Try to load from persistent storage
  return retrieveTokenValue<number>(TOKEN_EXPIRY_KEY);
}

/**
 * Sets the in-memory access token
 *
 * @param token Access token to store in memory
 */
export function setAccessTokenState(token: string | null): void {
  currentAccessToken = token;
}

/**
 * Sets the in-memory refresh token
 *
 * @param token Refresh token to store in memory
 */
export function setRefreshTokenState(token: string | null): void {
  currentRefreshToken = token;
}

/**
 * Sets the in-memory token expiry timestamp
 *
 * @param timestamp Token expiry timestamp to store in memory
 */
export function setTokenExpiryState(timestamp: number | null): void {
  tokenExpiryTimestamp = timestamp;
}

/**
 * Gets the current refresh timer
 *
 * @returns Current refresh timer or null if not set
 */
export function getRefreshTimer(): NodeJS.Timeout | null {
  return refreshTimer;
}

/**
 * Sets the refresh timer
 *
 * @param timer Timer to set, or null to clear
 */
export function setRefreshTimer(timer: NodeJS.Timeout | null): void {
  refreshTimer = timer;
}

/**
 * Clears the refresh timer if it exists
 */
export function clearRefreshTimer(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

/**
 * Clears all in-memory token state
 */
export function clearTokenState(): void {
  currentAccessToken = null;
  currentRefreshToken = null;
  tokenExpiryTimestamp = null;
  clearRefreshTimer();
}
