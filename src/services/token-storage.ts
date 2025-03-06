/**
 * Token Storage Service
 *
 * This module provides secure storage for Spotify authentication tokens.
 * It handles saving, loading, and clearing tokens from the user's local machine,
 * using encryption to protect sensitive credential information.
 *
 * Security Features:
 * - AES-256-GCM encryption for token data
 * - Secure storage of encryption keys in user data directory
 * - Authentication tags to verify data integrity
 *
 * The tokens are stored in the Electron app's user data directory in an
 * encrypted format to prevent unauthorized access.
 */

import { app } from "electron";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { saveLog } from "../helpers/storage/store";

// Constants for token storage
const TOKEN_FILE = "spotify-tokens.json";
const ENCRYPTION_KEY_FILE = "encryption-key";
const ALGORITHM = "aes-256-gcm";

/**
 * Structure of token data to be stored
 */
interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Get the filesystem path to the token storage file
 * Creates the directory if it doesn't exist
 *
 * @returns Full path to the token storage file
 */
function getTokenFilePath(): string {
  const userDataPath = app.getPath("userData");
  const dataPath = path.join(userDataPath, "data");

  // Ensure directory exists
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }

  return path.join(dataPath, TOKEN_FILE);
}

/**
 * Get the filesystem path to the encryption key file
 * Creates the directory if it doesn't exist
 *
 * @returns Full path to the encryption key file
 */
function getEncryptionKeyPath(): string {
  const userDataPath = app.getPath("userData");
  const dataPath = path.join(userDataPath, "data");

  // Ensure directory exists
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }

  return path.join(dataPath, ENCRYPTION_KEY_FILE);
}

/**
 * Get or create the encryption key for token data
 * If the key doesn't exist, a new one is generated and saved
 *
 * @returns Buffer containing the encryption key
 */
function getEncryptionKey(): Buffer {
  const keyPath = getEncryptionKeyPath();

  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath);
  }

  // Generate a new key if one doesn't exist
  const key = crypto.randomBytes(32); // 256 bits
  fs.writeFileSync(keyPath, key);
  saveLog("Generated new encryption key for token storage", "DEBUG");

  return key;
}

/**
 * Encrypt text data using AES-256-GCM
 * Uses a random initialization vector (IV) for each encryption
 *
 * @param text - Plain text to encrypt
 * @returns Object containing encrypted data and IV
 */
function encrypt(text: string): { encryptedData: string; iv: string } {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Store authentication tag with the encrypted data for verification during decryption
  return {
    encryptedData: encrypted + ":" + cipher.getAuthTag().toString("hex"),
    iv: iv.toString("hex"),
  };
}

/**
 * Decrypt previously encrypted data
 * Verifies data integrity using the authentication tag
 *
 * @param encryptedData - Data to decrypt (including authentication tag)
 * @param iv - Initialization vector used during encryption
 * @returns Decrypted text
 */
function decrypt(encryptedData: string, iv: string): string {
  const key = getEncryptionKey();
  const ivBuffer = Buffer.from(iv, "hex");

  // Split the data and authentication tag
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
 * Save Spotify tokens to encrypted storage
 *
 * @param tokenData - Access token, refresh token, and expiration information
 * @returns True if tokens were saved successfully, false otherwise
 */
export function saveTokens(tokenData: TokenData): boolean {
  try {
    const tokenFilePath = getTokenFilePath();
    const tokenDataString = JSON.stringify(tokenData);

    // Encrypt the token data
    const { encryptedData, iv } = encrypt(tokenDataString);

    // Create the storage object with encrypted data and IV
    const storageData = {
      encryptedData,
      iv,
    };

    // Write to file
    fs.writeFileSync(tokenFilePath, JSON.stringify(storageData));
    saveLog("Spotify tokens saved securely to disk", "DEBUG");

    return true;
  } catch (error) {
    saveLog(`Failed to save tokens: ${error}`, "ERROR");
    return false;
  }
}

/**
 * Load Spotify tokens from encrypted storage
 *
 * @returns TokenData object if tokens exist and can be decrypted, null otherwise
 */
export function loadTokens(): TokenData | null {
  try {
    const tokenFilePath = getTokenFilePath();

    // Check if token file exists
    if (!fs.existsSync(tokenFilePath)) {
      saveLog("No stored tokens found", "DEBUG");
      return null;
    }

    // Read and parse the file
    const fileContent = fs.readFileSync(tokenFilePath, "utf8");
    const storageData = JSON.parse(fileContent);

    // Decrypt the token data
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
 * Clear stored tokens
 * Removes the token file from disk
 *
 * @returns True if tokens were cleared successfully or didn't exist, false on error
 */
export function clearTokens(): boolean {
  try {
    const tokenFilePath = getTokenFilePath();

    // Check if token file exists before attempting to delete
    if (fs.existsSync(tokenFilePath)) {
      fs.unlinkSync(tokenFilePath);
      saveLog("Spotify tokens cleared from disk", "INFO");
    } else {
      saveLog("No tokens to clear", "DEBUG");
    }

    return true;
  } catch (error) {
    saveLog(`Failed to clear tokens: ${error}`, "ERROR");
    return false;
  }
}
