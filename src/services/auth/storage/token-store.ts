/**
 * Authentication Token Compatibility Layer Module
 *
 * Provides a backward-compatible interface that maintains the original token
 * management API while delegating to the new modular token services. This module
 * exists solely to support existing code that depends on the old API.
 *
 * Features:
 * - Complete compatibility with legacy token API
 * - Transparent delegation to specialized token modules
 * - Consistent function signatures for all token operations
 * - Re-exported constants for consistent token naming
 * - Clean transition path from legacy to modern token API
 *
 * This module serves as a facade over the modular token management system,
 * allowing existing code to continue functioning while new code can directly
 * use the more specialized token modules. It simply passes through all calls
 * to the appropriate specialized modules without adding any business logic.
 *
 * @deprecated New code should import directly from the specialized token modules
 * rather than using this compatibility layer.
 */

import { AuthTokens } from "@/types/auth";
import { initTokenStore as initTokenStoreOp } from "./token-init";
import {
  clearTokens as clearTokensOp,
  getAccessToken as getAccessTokenOp,
  getRefreshToken as getRefreshTokenOp,
  getTokenExpiry as getTokenExpiryOp,
  isAuthenticated as isAuthenticatedOp,
  setTokens as setTokensOp,
} from "./token-operations";
import { refreshAccessToken as refreshAccessTokenOp } from "./token-refresh";

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
 * Delegates to the token-operations module's setTokens function,
 * preserving the same function signature for backward compatibility.
 *
 * @param tokens Authentication tokens to store
 *
 * @example
 * // Store tokens using the compatibility API
 * import { setTokens } from "./auth/storage/token-store";
 *
 * setTokens({
 *   accessToken: "new-access-token",
 *   refreshToken: "new-refresh-token",
 *   expiresIn: 3600
 * });
 *
 * @deprecated Use setTokens from token-operations directly
 */
export function setTokens(tokens: AuthTokens): void {
  setTokensOp(tokens);
}

/**
 * Clears all stored authentication tokens
 *
 * Delegates to the token-operations module's clearTokens function,
 * preserving the same function signature for backward compatibility.
 *
 * @example
 * // Clear tokens during logout
 * import { clearTokens } from "./auth/storage/token-store";
 *
 * clearTokens();
 * showLoginScreen();
 *
 * @deprecated Use clearTokens from token-operations directly
 */
export function clearTokens(): void {
  clearTokensOp();
}

/**
 * Gets the current access token
 *
 * Delegates to the token-operations module's getAccessToken function,
 * preserving the same function signature for backward compatibility.
 *
 * @returns Current access token or null if not authenticated
 *
 * @example
 * // Get token for API request
 * import { getAccessToken } from "./auth/storage/token-store";
 *
 * const token = getAccessToken();
 * if (token) {
 *   headers.Authorization = `Bearer ${token}`;
 * }
 *
 * @deprecated Use getAccessToken from token-operations directly
 */
export function getAccessToken(): string | null {
  return getAccessTokenOp();
}

/**
 * Gets the current refresh token
 *
 * Delegates to the token-operations module's getRefreshToken function,
 * preserving the same function signature for backward compatibility.
 *
 * @returns Current refresh token or null if not authenticated
 *
 * @example
 * // Get refresh token
 * import { getRefreshToken } from "./auth/storage/token-store";
 *
 * const refreshToken = getRefreshToken();
 * console.log("Has refresh token:", !!refreshToken);
 *
 * @deprecated Use getRefreshToken from token-operations directly
 */
export function getRefreshToken(): string | null {
  return getRefreshTokenOp();
}

/**
 * Checks if the user is authenticated with valid tokens
 *
 * Delegates to the token-operations module's isAuthenticated function,
 * preserving the same function signature for backward compatibility.
 *
 * @returns True if authenticated with valid tokens, false otherwise
 *
 * @example
 * // Check authentication status
 * import { isAuthenticated } from "./auth/storage/token-store";
 *
 * if (isAuthenticated()) {
 *   showUserProfile();
 * } else {
 *   showLoginButton();
 * }
 *
 * @deprecated Use isAuthenticated from token-operations directly
 */
export function isAuthenticated(): boolean {
  return isAuthenticatedOp();
}

/**
 * Gets the token expiry timestamp
 *
 * Delegates to the token-operations module's getTokenExpiry function,
 * preserving the same function signature for backward compatibility.
 *
 * @returns Timestamp when the token expires (milliseconds since epoch) or null
 *
 * @example
 * // Check token expiration
 * import { getTokenExpiry } from "./auth/storage/token-store";
 *
 * const expiry = getTokenExpiry();
 * if (expiry) {
 *   const minutesRemaining = Math.floor((expiry - Date.now()) / 60000);
 *   console.log(`Token expires in ${minutesRemaining} minutes`);
 * }
 *
 * @deprecated Use getTokenExpiry from token-operations directly
 */
export function getTokenExpiry(): number | null {
  return getTokenExpiryOp();
}

/**
 * Refreshes the access token using the refresh token
 *
 * Delegates to the token-refresh module's refreshAccessToken function,
 * preserving the same function signature for backward compatibility.
 *
 * @returns Promise resolving to true if refresh was successful
 *
 * @example
 * // Manually refresh token
 * import { refreshAccessToken } from "./auth/storage/token-store";
 *
 * async function ensureFreshToken() {
 *   const success = await refreshAccessToken();
 *   if (!success) {
 *     console.error("Token refresh failed");
 *   }
 * }
 *
 * @deprecated Use refreshAccessToken from token-refresh directly
 */
export async function refreshAccessToken(): Promise<boolean> {
  return refreshAccessTokenOp();
}

/**
 * Initializes the token store, loading tokens from persistent storage
 * and scheduling refresh if needed
 *
 * Delegates to the token-init module's initTokenStore function,
 * preserving the same function signature for backward compatibility.
 *
 * @example
 * // Initialize during app startup
 * import { initTokenStore } from "./auth/storage/token-store";
 *
 * initTokenStore();
 * console.log("Token system initialized");
 *
 * @deprecated Use initTokenStore from token-init directly
 */
export function initTokenStore(): void {
  initTokenStoreOp();
}
