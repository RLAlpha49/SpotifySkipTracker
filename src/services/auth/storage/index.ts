/**
 * @packageDocumentation
 * @module auth/storage
 * @description Token Storage Service Module
 *
 * This module serves as the unified entry point for the token storage subsystem,
 * exposing a clean, consolidated API for all authentication token operations while
 * hiding the internal complexity of the modular implementation. It aggregates and
 * re-exports functionality from specialized token handling modules.
 *
 * Features:
 * - Comprehensive token lifecycle management (creation, reading, updating, deletion)
 * - Memory and persistent storage synchronization
 * - Automatic token refresh scheduling and execution
 * - Secure encryption of sensitive token data
 * - Token validation and expiration management
 * - State management for authentication status tracking
 * - Cross-module coordination for token operations
 *
 * Architecture:
 * The token storage system is split into five specialized modules:
 *
 * 1. token-storage.ts - Low-level persistent storage operations
 * 2. token-state.ts - In-memory state management and caching
 * 3. token-refresh.ts - Token refresh scheduling and execution
 * 4. token-operations.ts - High-level token operation coordination
 * 5. token-init.ts - Initialization and bootstrap functionality
 *
 * This modular design enables clear separation of concerns while the
 * index module provides a simplified facade for external consumption.
 * Consumers can import all token management functionality from this
 * single entry point without needing to understand the underlying
 * module structure.
 *
 * @module TokenStorageService
 * @source
 */

// Re-export storage constants and utilities
export {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  TOKEN_EXPIRY_KEY,
  clearTokenStorage,
  readTokenStorage,
  removeTokenValue,
  retrieveTokenValue,
  storeTokenValue,
  writeTokenStorage,
} from "./token-storage";

// Re-export token state management
export {
  REFRESH_MARGIN,
  clearTokenState,
  getAccessTokenState,
  getRefreshTokenState,
  getTokenExpiryState,
  setAccessTokenState,
  setRefreshTokenState,
  setTokenExpiryState,
} from "./token-state";

// Re-export token refresh operations
export { refreshAccessToken, scheduleTokenRefresh } from "./token-refresh";

// Re-export main token operations
export {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getTokenExpiry,
  isAuthenticated,
  setTokens,
} from "./token-operations";

// Re-export initialization
export { initTokenStore } from "./token-init";

// Note: token-store.ts is not re-exported as it's a compatibility layer
