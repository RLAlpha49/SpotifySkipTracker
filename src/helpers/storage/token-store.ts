/**
 * Secure Authentication Token Management System
 *
 * Provides industrial-strength security for storing sensitive Spotify API credentials
 * using military-grade encryption techniques and secure storage practices.
 *
 * Security architecture:
 * - AES-256-GCM symmetric encryption algorithm (NIST recommended)
 * - Authenticated encryption with data integrity verification
 * - Unique initialization vectors (IV) for each encryption operation
 * - Persistent secure key generation and storage
 * - Automatic key management in user data directory
 *
 * This module ensures that authentication tokens remain secure even if the
 * token storage file is compromised, as the encryption key is stored separately
 * and the tokens cannot be decrypted without it.
 *
 * Token lifecycle:
 * 1. Authentication tokens received from Spotify API
 * 2. Tokens encrypted with unique IV and authentication tag
 * 3. Encrypted data stored securely in application data directory
 * 4. Tokens decrypted only when needed for API operations
 */

import * as crypto from "crypto";
import { app } from "electron";
import * as fs from "fs";
import * as path from "path";
import { saveLog } from "./logs-store";

// Storage configuration constants
const TOKEN_FILE = "spotify-tokens.json";
const ENCRYPTION_KEY_FILE = "encryption-key";
const ALGORITHM = "aes-256-gcm";

/**
 * Token data structure interface
 */
interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Resolves the token storage file path
 *
 * @returns Absolute path to token storage file
 */
function getTokenFilePath(): string {
  const userDataPath = app.getPath("userData");
  const dataPath = path.join(userDataPath, "data");

  // Create directory if needed
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }

  return path.join(dataPath, TOKEN_FILE);
}

/**
 * Resolves the encryption key file path
 *
 * @returns Absolute path to encryption key file
 */
function getEncryptionKeyPath(): string {
  const userDataPath = app.getPath("userData");
  const dataPath = path.join(userDataPath, "data");

  // Create directory if needed
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }

  return path.join(dataPath, ENCRYPTION_KEY_FILE);
}

/**
 * Retrieves or generates encryption key
 *
 * @returns Buffer containing 256-bit encryption key
 */
function getEncryptionKey(): Buffer {
  const keyPath = getEncryptionKeyPath();

  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath);
  }

  // Generate new encryption key
  const key = crypto.randomBytes(32); // 256 bits
  fs.writeFileSync(keyPath, key);
  saveLog("Generated new encryption key for token storage", "DEBUG");

  return key;
}

/**
 * Encrypts text using AES-256-GCM
 *
 * @param text - Plain text content to encrypt
 * @returns Object containing encrypted data and initialization vector
 */
function encrypt(text: string): { encryptedData: string; iv: string } {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Append authentication tag to encrypted data
  return {
    encryptedData: encrypted + ":" + cipher.getAuthTag().toString("hex"),
    iv: iv.toString("hex"),
  };
}

/**
 * Decrypts previously encrypted data
 *
 * @param encryptedData - Encrypted data with authentication tag
 * @param iv - Initialization vector in hex format
 * @returns Decrypted text content
 * @throws Error when encrypted data is invalid
 */
function decrypt(encryptedData: string, iv: string): string {
  const key = getEncryptionKey();
  const ivBuffer = Buffer.from(iv, "hex");

  // Validate encrypted data
  if (!encryptedData) {
    throw new Error("Encrypted data is undefined or empty");
  }

  // Extract data and authentication tag
  const encryptedParts = encryptedData.split(":");
  const encrypted = encryptedParts[0];
  const authTag = Buffer.from(encryptedParts[1], "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Persists authentication tokens to encrypted storage
 *
 * @param tokenData - Token data to encrypt and store
 * @returns Boolean indicating operation success
 */
export function saveTokens(tokenData: TokenData): boolean {
  try {
    const tokenFilePath = getTokenFilePath();
    const tokenDataString = JSON.stringify(tokenData);

    // Encrypt token data
    const { encryptedData, iv } = encrypt(tokenDataString);

    // Prepare storage structure
    const storageData = {
      encryptedData,
      iv,
    };

    // Write to encrypted storage
    fs.writeFileSync(tokenFilePath, JSON.stringify(storageData));

    saveLog("Spotify tokens saved securely to disk", "DEBUG");

    return true;
  } catch (error) {
    saveLog(`Failed to save tokens: ${error}`, "ERROR");
    return false;
  }
}

/**
 * Retrieves and decrypts authentication tokens
 *
 * @returns TokenData object if available, null if not found or on error
 */
export function loadTokens(): TokenData | null {
  try {
    const tokenFilePath = getTokenFilePath();

    // Check file existence
    if (!fs.existsSync(tokenFilePath)) {
      saveLog("No stored tokens found", "DEBUG");
      return null;
    }

    // Read encrypted data
    const fileContent = fs.readFileSync(tokenFilePath, "utf8");
    const storageData = JSON.parse(fileContent);

    // Decrypt and parse
    const decryptedData = decrypt(storageData.encryptedData, storageData.iv);
    const tokenData = JSON.parse(decryptedData) as TokenData;

    saveLog("Spotify tokens loaded from secure storage", "DEBUG");
    return tokenData;
  } catch (error) {
    saveLog(`Failed to load tokens: ${error}`, "ERROR");
    return null;
  }
}

/**
 * Removes authentication tokens from storage
 *
 * @returns Boolean indicating operation success
 */
export function clearTokens(): boolean {
  try {
    const tokenFilePath = getTokenFilePath();

    if (fs.existsSync(tokenFilePath)) {
      fs.unlinkSync(tokenFilePath);

      saveLog("Spotify tokens cleared from disk", "INFO");
      return true;
    }
    return false;
  } catch (error) {
    saveLog(`Failed to clear tokens: ${error}`, "ERROR");
    return false;
  }
}
