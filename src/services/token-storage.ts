import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { saveLog } from '../helpers/storage/store';

// Constants for token storage
const TOKEN_FILE = 'spotify-tokens.json';
const ENCRYPTION_KEY_FILE = 'encryption-key';
const ALGORITHM = 'aes-256-gcm';

// Token data structure
interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Get path to the token storage file
 */
function getTokenFilePath(): string {
  const userDataPath = app.getPath('userData');
  const dataPath = path.join(userDataPath, 'data');
  
  // Ensure directory exists
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  
  return path.join(dataPath, TOKEN_FILE);
}

/**
 * Get path to the encryption key file
 */
function getEncryptionKeyPath(): string {
  const userDataPath = app.getPath('userData');
  const dataPath = path.join(userDataPath, 'data');
  
  // Ensure directory exists
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  
  return path.join(dataPath, ENCRYPTION_KEY_FILE);
}

/**
 * Get or create encryption key
 */
function getEncryptionKey(): Buffer {
  const keyPath = getEncryptionKeyPath();
  
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath);
  }
  
  // Generate a new key if one doesn't exist
  const key = crypto.randomBytes(32); // 256 bits
  fs.writeFileSync(keyPath, key);
  saveLog('Generated new encryption key for token storage', 'DEBUG');
  
  return key;
}

/**
 * Encrypt data
 */
function encrypt(text: string): { encryptedData: string; iv: string } {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    encryptedData: encrypted + ':' + cipher.getAuthTag().toString('hex'),
    iv: iv.toString('hex')
  };
}

/**
 * Decrypt data
 */
function decrypt(encryptedData: string, iv: string): string {
  const key = getEncryptionKey();
  const ivBuffer = Buffer.from(iv, 'hex');
  
  const encryptedParts = encryptedData.split(':');
  const encrypted = encryptedParts[0];
  const authTag = Buffer.from(encryptedParts[1], 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Save tokens to storage
 */
export function saveTokens(tokenData: TokenData): boolean {
  try {
    const tokenFilePath = getTokenFilePath();
    const dataString = JSON.stringify(tokenData);
    
    // Encrypt tokens before storing
    const { encryptedData, iv } = encrypt(dataString);
    
    // Store encrypted data with IV
    const dataToSave = {
      data: encryptedData,
      iv,
      timestamp: Date.now()
    };
    
    fs.writeFileSync(tokenFilePath, JSON.stringify(dataToSave));
    saveLog('Saved encrypted tokens to storage', 'DEBUG');
    
    return true;
  } catch (error) {
    saveLog(`Failed to save tokens: ${error}`, 'ERROR');
    return false;
  }
}

/**
 * Load tokens from storage
 */
export function loadTokens(): TokenData | null {
  try {
    const tokenFilePath = getTokenFilePath();
    
    if (!fs.existsSync(tokenFilePath)) {
      return null;
    }
    
    const fileContent = fs.readFileSync(tokenFilePath, 'utf8');
    const storedData = JSON.parse(fileContent);
    
    // Decrypt the data
    const decryptedData = decrypt(storedData.data, storedData.iv);
    const tokenData = JSON.parse(decryptedData) as TokenData;
    
    // Check if tokens are expired
    if (tokenData.expiresAt < Date.now()) {
      saveLog('Loaded tokens are expired', 'DEBUG');
      return tokenData; // Still return data so refresh token can be used
    }
    
    saveLog('Successfully loaded tokens from storage', 'DEBUG');
    return tokenData;
  } catch (error) {
    saveLog(`Failed to load tokens: ${error}`, 'ERROR');
    return null;
  }
}

/**
 * Clear tokens from storage
 */
export function clearTokens(): boolean {
  try {
    const tokenFilePath = getTokenFilePath();
    
    if (fs.existsSync(tokenFilePath)) {
      fs.unlinkSync(tokenFilePath);
      saveLog('Cleared tokens from storage', 'DEBUG');
    }
    
    return true;
  } catch (error) {
    saveLog(`Failed to clear tokens: ${error}`, 'ERROR');
    return false;
  }
} 