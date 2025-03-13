/**
 * Auth token storage service - Compatibility Layer
 *
 * This file is maintained for backward compatibility and delegates
 * to the new modular token storage services.
 *
 * @deprecated Use the modular token services instead
 */

import { AuthTokens } from "@/types/auth";
import {
  getAccessToken as getAccessTokenOp,
  getRefreshToken as getRefreshTokenOp,
  getTokenExpiry as getTokenExpiryOp,
  setTokens as setTokensOp,
  clearTokens as clearTokensOp,
  isAuthenticated as isAuthenticatedOp,
} from "./token-operations";
import { refreshAccessToken as refreshAccessTokenOp } from "./token-refresh";
import { initTokenStore as initTokenStoreOp } from "./token-init";

// Re-export the storage keys for compatibility
export {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  TOKEN_EXPIRY_KEY,
} from "./token-storage";

// Re-export REFRESH_MARGIN for compatibility
export { REFRESH_MARGIN } from "./token-state";

/**
 * Sets authentication tokens and stores them
 *
 * @param tokens Authentication tokens to store
 */
export function setTokens(tokens: AuthTokens): void {
  setTokensOp(tokens);
}

/**
 * Clears all stored authentication tokens
 */
export function clearTokens(): void {
  clearTokensOp();
}

/**
 * Gets the current access token
 *
 * @returns Current access token or null if not authenticated
 */
export function getAccessToken(): string | null {
  return getAccessTokenOp();
}

/**
 * Gets the current refresh token
 *
 * @returns Current refresh token or null if not authenticated
 */
export function getRefreshToken(): string | null {
  return getRefreshTokenOp();
}

/**
 * Checks if the user is authenticated with valid tokens
 *
 * @returns True if authenticated with valid tokens, false otherwise
 */
export function isAuthenticated(): boolean {
  return isAuthenticatedOp();
}

/**
 * Gets the token expiry timestamp
 *
 * @returns Timestamp when the token expires or null if not authenticated
 */
export function getTokenExpiry(): number | null {
  return getTokenExpiryOp();
}

/**
 * Refreshes the access token using the refresh token
 *
 * @returns Promise resolving to true if refresh was successful
 */
export async function refreshAccessToken(): Promise<boolean> {
  return refreshAccessTokenOp();
}

/**
 * Initializes the token store, loading tokens from persistent storage
 * and scheduling refresh if needed
 */
export function initTokenStore(): void {
  initTokenStoreOp();
}
