/**
 * Spotify API Credentials Manager
 *
 * This module handles the secure management of Spotify API credentials (client ID and secret)
 * required for all API operations. It provides functions for setting, retrieving, and validating
 * these credentials throughout the application.
 *
 * Features:
 * - Secure in-memory credential storage
 * - Validation of credential presence
 * - Error handling for missing credentials
 * - Protection against invalid or incomplete credentials
 *
 * Usage:
 * ```typescript
 * import { setCredentials, getCredentials } from '@/services/spotify/credentials';
 *
 * // Set credentials once at application startup
 * setCredentials('your-client-id', 'your-client-secret');
 *
 * // Later, credentials can be retrieved when needed
 * const { clientId, clientSecret } = getCredentials();
 * ```
 *
 * @module SpotifyCredentials
 */

import { saveLog } from "../../helpers/storage/logs-store";

// Shared credentials for API calls
let sharedClientId: string = "";
let sharedClientSecret: string = "";

/**
 * Sets the shared credentials for all API calls
 *
 * @param clientId - Spotify application client ID
 * @param clientSecret - Spotify application client secret
 */
export function setCredentials(clientId: string, clientSecret: string): void {
  sharedClientId = clientId;
  sharedClientSecret = clientSecret;
  saveLog("Spotify API credentials updated", "DEBUG");
}

/**
 * Checks if shared credentials are set
 *
 * @returns true if both client ID and client secret are set
 */
export function hasCredentials(): boolean {
  return Boolean(sharedClientId && sharedClientSecret);
}

/**
 * Gets the currently set credentials
 *
 * @returns Object containing client ID and secret
 */
export function getCredentials(): { clientId: string; clientSecret: string } {
  return { clientId: sharedClientId, clientSecret: sharedClientSecret };
}

/**
 * Ensures that credentials are set before making API calls
 *
 * @throws Error if credentials are not set
 */
export function ensureCredentialsSet(): void {
  if (!hasCredentials()) {
    throw new Error(
      "Spotify API credentials not set. Call setCredentials() first.",
    );
  }
}
