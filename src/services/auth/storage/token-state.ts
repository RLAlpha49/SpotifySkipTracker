/**
 * Token In-Memory State Management Module
 *
 * Manages the ephemeral in-memory state of authentication tokens and related data
 * for the application's authentication system, providing fast access to authentication
 * information without requiring persistent storage lookups.
 *
 * Features:
 * - High-performance in-memory token storage for frequent access
 * - Dual memory/storage architecture with persistent storage fallback
 * - Refresh timer management for automatic token renewal
 * - Token state getters and setters with consistent access patterns
 * - Memory state cleanup during logout or token invalidation
 * - Configurable token refresh safety margin
 * - State initialization from persistent storage when needed
 *
 * This module implements the memory-side of the dual memory/persistent storage
 * architecture, optimizing token access performance by minimizing disk operations
 * after initial loading. The state is synchronized with persistent storage
 * when tokens change, ensuring data consistency and reliability.
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
 * Retrieves the current access token using a memory-first strategy:
 * 1. Returns the in-memory token if available for maximum performance
 * 2. Falls back to loading from persistent storage if not in memory
 *
 * This dual approach balances performance with reliability, ensuring
 * token availability across application restarts.
 *
 * @returns The current access token or null if not available
 *
 * @example
 * // Get access token for API request
 * const token = getAccessTokenState();
 * if (token) {
 *   headers.Authorization = `Bearer ${token}`;
 * }
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
 * Retrieves the current refresh token using a memory-first strategy:
 * 1. Returns the in-memory token if available for maximum performance
 * 2. Falls back to loading from persistent storage if not in memory
 *
 * The refresh token is critical for obtaining new access tokens when
 * the current one expires, maintaining continuous authentication.
 *
 * @returns The current refresh token or null if not available
 *
 * @example
 * // Check if we have a refresh token before attempting token refresh
 * const refreshToken = getRefreshTokenState();
 * if (refreshToken) {
 *   // We can refresh the access token when needed
 *   scheduleTokenRefresh(3600);
 * }
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
 * Retrieves the timestamp when the current access token expires using
 * a memory-first strategy:
 * 1. Returns the in-memory timestamp if available for maximum performance
 * 2. Falls back to loading from persistent storage if not in memory
 *
 * The expiry timestamp is used to determine when to refresh tokens
 * and if the current token is still valid for API requests.
 *
 * @returns The token expiry timestamp (milliseconds since epoch) or null if not available
 *
 * @example
 * // Check if token needs immediate refresh
 * const expiry = getTokenExpiryState();
 * if (expiry && expiry - Date.now() < 60000) {
 *   // Token expires in less than a minute, refresh now
 *   refreshAccessToken();
 * }
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
 * Updates the access token in memory for fast retrieval by future operations.
 * This function does not persist the token to storage - that responsibility
 * belongs to the token operations module.
 *
 * @param token Access token to store in memory, or null to clear
 *
 * @example
 * // Update token in memory after refresh
 * setAccessTokenState(newAccessToken);
 */
export function setAccessTokenState(token: string | null): void {
  currentAccessToken = token;
}

/**
 * Sets the in-memory refresh token
 *
 * Updates the refresh token in memory for fast retrieval by future operations.
 * This function does not persist the token to storage - that responsibility
 * belongs to the token operations module.
 *
 * @param token Refresh token to store in memory, or null to clear
 *
 * @example
 * // Update refresh token in memory after authentication
 * setRefreshTokenState(newRefreshToken);
 */
export function setRefreshTokenState(token: string | null): void {
  currentRefreshToken = token;
}

/**
 * Sets the in-memory token expiry timestamp
 *
 * Updates the token expiration timestamp in memory for future validity checks.
 * This function does not persist the timestamp to storage - that responsibility
 * belongs to the token operations module.
 *
 * @param timestamp Token expiry timestamp (milliseconds since epoch) to store in memory, or null to clear
 *
 * @example
 * // Calculate and set expiry timestamp
 * const expiryMs = Date.now() + (expiresIn * 1000);
 * setTokenExpiryState(expiryMs);
 */
export function setTokenExpiryState(timestamp: number | null): void {
  tokenExpiryTimestamp = timestamp;
}

/**
 * Gets the current refresh timer
 *
 * Retrieves the NodeJS Timeout object for the scheduled token refresh
 * operation, which can be used to check if a refresh is already scheduled.
 *
 * @returns Current refresh timer or null if no refresh is scheduled
 *
 * @example
 * // Check if refresh is already scheduled before scheduling a new one
 * if (!getRefreshTimer()) {
 *   scheduleTokenRefresh(expiresIn);
 * }
 */
export function getRefreshTimer(): NodeJS.Timeout | null {
  return refreshTimer;
}

/**
 * Sets the refresh timer
 *
 * Updates the stored reference to the token refresh timer, allowing
 * for centralized management of the refresh scheduling system.
 *
 * @param timer Timer to set, or null to indicate no active timer
 *
 * @example
 * // Set the refresh timer after scheduling
 * const timer = setTimeout(refreshAccessToken, 3300000);
 * setRefreshTimer(timer);
 */
export function setRefreshTimer(timer: NodeJS.Timeout | null): void {
  refreshTimer = timer;
}

/**
 * Clears the refresh timer if it exists
 *
 * Cancels any scheduled token refresh operation and removes the timer
 * reference. This should be called when tokens are refreshed manually
 * or when authentication is terminated.
 *
 * @example
 * // Cancel automatic refresh during logout
 * clearRefreshTimer();
 * clearTokenState();
 */
export function clearRefreshTimer(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

/**
 * Clears all in-memory token state
 *
 * Completely resets the authentication state in memory by:
 * 1. Clearing the access token, refresh token, and expiry timestamp
 * 2. Canceling any pending token refresh operations
 *
 * This function is typically called during logout or when authentication
 * needs to be completely reset.
 *
 * @example
 * // Reset all authentication state during logout
 * clearTokenState();
 * displayLoginScreen();
 */
export function clearTokenState(): void {
  currentAccessToken = null;
  currentRefreshToken = null;
  tokenExpiryTimestamp = null;
  clearRefreshTimer();
}
