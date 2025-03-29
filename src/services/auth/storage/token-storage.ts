/**
 * @packageDocumentation
 * @module auth/storage/token-storage
 * @description Legacy Token Storage Persistence Module
 *
 * Provides a backward-compatible interface for token management operations,
 * previously used for persistent token storage but now operating as an
 * in-memory compatibility layer.
 *
 * Features:
 * - Memory-only token storage for backward compatibility
 * - Complete token management API (store, retrieve, remove)
 * - Consistent key naming for token-related data
 * - Type-safe token value retrieval
 * - Clean token storage clearing functionality
 *
 * This module is primarily maintained for compatibility with existing code
 * that relies on its API. New code should use the more specialized token
 * management modules (token-operations.ts, token-state.ts) that provide
 * more robust and secure storage mechanisms.
 *
 * @deprecated This module is maintained for backward compatibility only.
 * New code should use the modular token services directly from token-operations.ts.
 */

import { TokenStorage, TokenValue } from "@/types/token";

// Tokens are now stored only in memory in this module
// for backwards compatibility with code that still uses this API
const memoryTokenStorage: TokenStorage = {};

// Token storage keys
export const ACCESS_TOKEN_KEY = "spotify_access_token";
export const REFRESH_TOKEN_KEY = "spotify_refresh_token";
export const TOKEN_EXPIRY_KEY = "spotify_token_expiry";

/**
 * Reads token data from memory storage
 *
 * Retrieves a copy of the entire token storage object, containing
 * all token-related data currently in memory. The returned object
 * is a shallow clone to prevent direct modification of the storage.
 *
 * @returns Record containing stored token data or empty object if no data exists
 *
 * @example
 * // Check all token data at once
 * const tokenData = readTokenStorage();
 * if (tokenData[ACCESS_TOKEN_KEY]) {
 *   // We have an access token
 * }
 *
 * @deprecated Use getAccessToken, getRefreshToken, etc. from token-operations instead
 * @source
 */
export function readTokenStorage(): TokenStorage {
  return { ...memoryTokenStorage };
}

/**
 * Writes token data to memory storage
 *
 * Updates the in-memory token storage with the provided data,
 * merging it with any existing data rather than replacing it completely.
 *
 * @param data Token data to write to storage
 *
 * @example
 * // Update multiple token values at once
 * writeTokenStorage({
 *   [ACCESS_TOKEN_KEY]: "new-access-token",
 *   [TOKEN_EXPIRY_KEY]: Date.now() + 3600000
 * });
 *
 * @deprecated Use setTokens from token-operations instead
 * @source
 */
export function writeTokenStorage(data: TokenStorage): void {
  Object.assign(memoryTokenStorage, data);
}

/**
 * Stores a token value in memory storage
 *
 * Sets a single token-related value in the memory storage.
 * This is a more granular alternative to writeTokenStorage
 * when only one value needs to be updated.
 *
 * @param key Token key to store
 * @param value Token value to store
 *
 * @example
 * // Store just the access token
 * storeTokenValue(ACCESS_TOKEN_KEY, "new-access-token");
 *
 * @deprecated Use setTokens from token-operations instead
 * @source
 */
export function storeTokenValue(key: string, value: TokenValue): void {
  memoryTokenStorage[key] = value;
}

/**
 * Retrieves a token value from memory storage
 *
 * Gets a specific token value from memory storage with type safety.
 * The generic parameter T allows for proper typing of the returned value.
 *
 * @param key Token key to retrieve
 * @returns The stored value or null if not found
 *
 * @example
 * // Get access token with proper typing
 * const accessToken = retrieveTokenValue<string>(ACCESS_TOKEN_KEY);
 * if (accessToken) {
 *   // Use the access token
 * }
 *
 * @deprecated Use getAccessToken, getRefreshToken, etc. from token-operations instead
 * @source
 */
export function retrieveTokenValue<T extends TokenValue>(
  key: string,
): T | null {
  return (memoryTokenStorage[key] as T) || null;
}

/**
 * Removes a token value from memory storage
 *
 * Deletes a specific token value from the memory storage.
 * If the key doesn't exist, this operation has no effect.
 *
 * @param key Token key to remove
 *
 * @example
 * // Remove the access token only
 * removeTokenValue(ACCESS_TOKEN_KEY);
 *
 * @deprecated Use clearTokens from token-operations instead
 * @source
 */
export function removeTokenValue(key: string): void {
  delete memoryTokenStorage[key];
}

/**
 * Clears all token values from memory storage
 *
 * Completely removes all token-related data from memory storage,
 * effectively resetting the authentication state to unauthenticated.
 *
 * @example
 * // Clear all authentication data during logout
 * clearTokenStorage();
 *
 * @deprecated Use clearTokens from token-operations instead
 * @source
 */
export function clearTokenStorage(): void {
  Object.keys(memoryTokenStorage).forEach((key) => {
    delete memoryTokenStorage[key];
  });
}
