/**
 * Token Storage Service
 *
 * Re-exports all token storage functionality from modular components.
 * This file serves as the main entry point for token storage operations.
 */

// Re-export storage constants and utilities
export {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  TOKEN_EXPIRY_KEY,
  readTokenStorage,
  writeTokenStorage,
  storeTokenValue,
  retrieveTokenValue,
  removeTokenValue,
  clearTokenStorage,
} from "./token-storage";

// Re-export token state management
export {
  REFRESH_MARGIN,
  getAccessTokenState,
  getRefreshTokenState,
  getTokenExpiryState,
  setAccessTokenState,
  setRefreshTokenState,
  setTokenExpiryState,
  clearTokenState,
} from "./token-state";

// Re-export token refresh operations
export { scheduleTokenRefresh, refreshAccessToken } from "./token-refresh";

// Re-export main token operations
export {
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getTokenExpiry,
  isAuthenticated,
} from "./token-operations";

// Re-export initialization
export { initTokenStore } from "./token-init";

// Note: token-store.ts is not re-exported as it's a compatibility layer
