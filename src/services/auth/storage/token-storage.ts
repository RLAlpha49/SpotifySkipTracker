/**
 * DEPRECATED - Token storage persistence
 *
 * This file is kept for backwards compatibility but no longer writes to disk.
 * All token storage is now handled by the secure encrypted token storage module.
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
 * @returns Record containing stored token data or empty object if no data exists
 */
export function readTokenStorage(): TokenStorage {
  return { ...memoryTokenStorage };
}

/**
 * Writes token data to memory storage
 *
 * @param data Token data to write to storage
 */
export function writeTokenStorage(data: TokenStorage): void {
  Object.assign(memoryTokenStorage, data);
}

/**
 * Stores a token value in memory storage
 *
 * @param key Token key to store
 * @param value Token value to store
 */
export function storeTokenValue(key: string, value: TokenValue): void {
  memoryTokenStorage[key] = value;
}

/**
 * Retrieves a token value from memory storage
 *
 * @param key Token key to retrieve
 * @returns The stored value or null if not found
 */
export function retrieveTokenValue<T extends TokenValue>(
  key: string,
): T | null {
  return (memoryTokenStorage[key] as T) || null;
}

/**
 * Removes a token value from memory storage
 *
 * @param key Token key to remove
 */
export function removeTokenValue(key: string): void {
  delete memoryTokenStorage[key];
}

/**
 * Clears all token values from memory storage
 */
export function clearTokenStorage(): void {
  Object.keys(memoryTokenStorage).forEach((key) => {
    delete memoryTokenStorage[key];
  });
}
