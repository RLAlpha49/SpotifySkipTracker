/**
 * Token storage persistence
 *
 * Handles reading and writing token data to persistent storage.
 */

import fs from "fs";
import path from "path";
import { appDataPath } from "../../../helpers/storage/utils";
import { saveLog } from "../../../helpers/storage/logs-store";

// Storage location for auth tokens
export const TOKEN_STORAGE_PATH = path.join(appDataPath, "auth_tokens.json");

// Token storage keys
export const ACCESS_TOKEN_KEY = "spotify_access_token";
export const REFRESH_TOKEN_KEY = "spotify_refresh_token";
export const TOKEN_EXPIRY_KEY = "spotify_token_expiry";

// Define token value types
export type TokenValue = string | number | null | undefined;
export type TokenStorage = Record<string, TokenValue>;

/**
 * Reads token data from persistent storage
 *
 * @returns Record containing stored token data or empty object if no data exists
 */
export function readTokenStorage(): TokenStorage {
  try {
    if (fs.existsSync(TOKEN_STORAGE_PATH)) {
      const data = fs.readFileSync(TOKEN_STORAGE_PATH, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    saveLog(`Error reading token storage: ${error}`, "ERROR");
  }
  return {};
}

/**
 * Writes token data to persistent storage
 *
 * @param data Token data to write to storage
 */
export function writeTokenStorage(data: TokenStorage): void {
  try {
    // Ensure directory exists
    if (!fs.existsSync(path.dirname(TOKEN_STORAGE_PATH))) {
      fs.mkdirSync(path.dirname(TOKEN_STORAGE_PATH), { recursive: true });
    }
    fs.writeFileSync(TOKEN_STORAGE_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    saveLog(`Error writing token storage: ${error}`, "ERROR");
  }
}

/**
 * Stores a token value in persistent storage
 *
 * @param key Token key to store
 * @param value Token value to store
 */
export function storeTokenValue(key: string, value: TokenValue): void {
  const tokenData = readTokenStorage();
  tokenData[key] = value;
  writeTokenStorage(tokenData);
}

/**
 * Retrieves a token value from persistent storage
 *
 * @param key Token key to retrieve
 * @returns The stored value or null if not found
 */
export function retrieveTokenValue<T extends TokenValue>(
  key: string,
): T | null {
  const tokenData = readTokenStorage();
  return (tokenData[key] as T) || null;
}

/**
 * Removes a token value from persistent storage
 *
 * @param key Token key to remove
 */
export function removeTokenValue(key: string): void {
  const tokenData = readTokenStorage();
  delete tokenData[key];
  writeTokenStorage(tokenData);
}

/**
 * Clears all token values from persistent storage
 */
export function clearTokenStorage(): void {
  writeTokenStorage({});
}
