/**
 * @packageDocumentation
 * @module auth
 * @description Authentication Service Module
 *
 * This module serves as the central hub for all Spotify authentication operations,
 * integrating multiple specialized components into a cohesive authentication system.
 * It provides a clean, unified API for the rest of the application to handle all
 * aspects of the authentication lifecycle.
 *
 * Features:
 * - Single entry point for all authentication operations
 * - Complete OAuth 2.0 authorization flow implementation
 * - Secure token management (storage, retrieval, refresh)
 * - Authentication window lifecycle management
 * - Local callback server for OAuth redirects
 * - Session state persistence across application restarts
 * - Credential validation and management
 * - Token encryption for enhanced security
 * - Automatic token refresh scheduling with configurable timing
 * - Authentication state validation with expiry checking
 * - Clean dependency management through dynamic imports
 *
 * Architecture:
 * This module implements a facade pattern to abstract authentication complexity,
 * delegating specialized tasks to five primary submodules:
 *
 * 1. Window - Authentication browser window management
 * 2. Server - OAuth callback server for redirect handling
 * 3. OAuth - Authorization flow coordination
 * 4. Session - User session state management
 * 5. Storage - Secure token persistence and retrieval
 *
 * To prevent circular dependencies while maintaining a clean API, this module
 * uses dynamic imports for storage operations while providing a consistent
 * public interface to the rest of the application.
 *
 * @module AuthenticationService
 * @source
 */

import { AuthTokens } from "@/types/auth";

// Export window management functions
export {
  closeAuthWindow,
  createAuthWindow,
  hasActiveAuthWindow,
} from "./window";

// Export server functions
export { createCallbackServer, shutdownServer } from "./server";

// Export OAuth flow functions
export { cancelAuthFlow, startAuthFlow } from "./oauth";

/**
 * Stores authentication tokens securely
 *
 * Persists the full set of OAuth tokens (access token, refresh token,
 * and expiry time) to secure storage. Dynamically imports the token
 * storage module to avoid circular dependencies.
 *
 * This function:
 * - Encrypts sensitive token data before storage
 * - Updates both memory state and persistent storage
 * - Triggers automatic token refresh scheduling
 * - Logs appropriate debugging information
 * - Handles errors gracefully with detailed reporting
 *
 * @param tokens - Complete authentication token set
 * @returns Promise resolving when tokens are successfully stored
 *
 * @example
 * // Store tokens after successful authentication
 * await setTokens({
 *   accessToken: "spotify-access-token",
 *   refreshToken: "spotify-refresh-token",
 *   expiresIn: 3600
 * });
 * console.log("User is now authenticated and tokens are stored securely");
 * @source
 */
export async function setTokens(tokens: AuthTokens): Promise<void> {
  const mod = await import("./storage/token-operations");
  return mod.setTokens(tokens);
}

/**
 * Retrieves the current Spotify access token
 *
 * Gets the currently stored access token for API requests.
 * Dynamically imports the token module to avoid circular dependencies.
 *
 * This function:
 * - Attempts to retrieve token from memory state first
 * - Falls back to secure storage if not in memory
 * - Rehydrates memory state from storage when needed
 * - Returns null if no valid token exists
 * - Handles all retrieval errors gracefully
 *
 * @returns Promise resolving to the access token or null if not authenticated
 *
 * @example
 * // Get token for API request
 * const token = await getAccessToken();
 * if (token) {
 *   headers.Authorization = `Bearer ${token}`;
 *   await makeApiRequest("/me", headers);
 * } else {
 *   // Handle unauthenticated state
 *   showLoginPrompt();
 * }
 * @source
 */
export async function getAccessToken(): Promise<string | null> {
  const mod = await import("./storage/token-operations");
  return mod.getAccessToken();
}

/**
 * Retrieves the stored refresh token
 *
 * Gets the currently stored refresh token used for obtaining
 * new access tokens when they expire. Dynamically imports the
 * token module to avoid circular dependencies.
 *
 * This function:
 * - Attempts to retrieve token from memory state first
 * - Falls back to secure storage if not in memory
 * - Rehydrates memory state from storage when needed
 * - Returns null if no valid refresh token exists
 * - Handles all retrieval errors gracefully
 *
 * @returns Promise resolving to the refresh token or null if not authenticated
 *
 * @example
 * // Check if we have a refresh token before attempting refresh
 * const refreshToken = await getRefreshToken();
 * if (refreshToken) {
 *   const success = await refreshAccessToken();
 *   if (success) {
 *     console.log("Successfully refreshed access token");
 *   }
 * }
 * @source
 */
export async function getRefreshToken(): Promise<string | null> {
  const mod = await import("./storage/token-operations");
  return mod.getRefreshToken();
}

/**
 * Retrieves the token expiration timestamp
 *
 * Gets the expiration time for the current access token.
 * Dynamically imports the token module to avoid circular dependencies.
 *
 * This function:
 * - Attempts to retrieve expiry from memory state first
 * - Falls back to secure storage if not in memory
 * - Rehydrates memory state from storage when needed
 * - Returns null if no expiry information exists
 * - Provides time in milliseconds since epoch format
 *
 * @returns Promise resolving to expiry timestamp (milliseconds since epoch) or null
 *
 * @example
 * // Check if token expires soon and needs refresh
 * const expiry = await getTokenExpiry();
 * if (expiry) {
 *   const timeUntilExpiry = expiry - Date.now();
 *   if (timeUntilExpiry < 300000) { // Less than 5 minutes
 *     await refreshAccessToken();
 *   }
 * }
 * @source
 */
export async function getTokenExpiry(): Promise<number | null> {
  const mod = await import("./storage/token-operations");
  return mod.getTokenExpiry();
}

/**
 * Removes all stored authentication tokens
 *
 * Clears access and refresh tokens from secure storage during logout
 * or when authentication needs to be reset. Dynamically imports the
 * token module to avoid circular dependencies.
 *
 * This function:
 * - Clears tokens from memory state
 * - Removes tokens from secure persistent storage
 * - Resets the Spotify API module state
 * - Logs the action for debugging purposes
 * - Handles all cleanup errors gracefully
 *
 * @returns Promise resolving when tokens are successfully cleared
 *
 * @example
 * // Clear tokens during logout
 * logoutButton.addEventListener('click', async () => {
 *   await clearTokens();
 *   showLoginScreen();
 *   displayMessage("You have been logged out successfully");
 * });
 * @source
 */
export async function clearTokens(): Promise<void> {
  const mod = await import("./storage/token-operations");
  return mod.clearTokens();
}

/**
 * Checks if the user is currently authenticated
 *
 * Verifies whether valid authentication tokens exist and
 * are not expired. Dynamically imports the token module
 * to avoid circular dependencies.
 *
 * This function:
 * - Checks for the existence of both access and refresh tokens
 * - Validates that the access token has not expired
 * - Handles edge cases (missing tokens, invalid expiry)
 * - Works correctly even after application restart
 *
 * @returns Promise resolving to authentication status
 *
 * @example
 * // Check auth before making API request
 * if (await isAuthenticated()) {
 *   // User is authenticated, proceed with operation
 *   const userData = await fetchUserProfile();
 *   displayUserData(userData);
 * } else {
 *   // User is not authenticated, show login
 *   showLoginButton();
 *   hideUserContent();
 * }
 * @source
 */
export async function isAuthenticated(): Promise<boolean> {
  const mod = await import("./storage/token-operations");
  return mod.isAuthenticated();
}

/**
 * Renews the access token using the refresh token
 *
 * Uses the stored refresh token to obtain a new access token
 * when the current one expires. Dynamically imports the token
 * refresh module to avoid circular dependencies.
 *
 * This function:
 * - Retrieves the current refresh token
 * - Makes a request to Spotify's token endpoint
 * - Updates stored tokens with the new access token
 * - Schedules the next refresh based on expiry
 * - Handles API errors with appropriate logging
 *
 * @returns Promise resolving to refresh success status
 *
 * @example
 * // Refresh the token before making an important API call
 * const refreshSucceeded = await refreshAccessToken();
 * if (refreshSucceeded) {
 *   // Token is fresh, proceed with API call
 *   const result = await performCriticalOperation();
 * } else {
 *   // Refresh failed, re-authenticate
 *   showLoginPrompt("Your session has expired. Please log in again.");
 * }
 * @source
 */
export async function refreshAccessToken(): Promise<boolean> {
  const mod = await import("./storage/token-refresh");
  return mod.refreshAccessToken();
}

/**
 * Sets up automatic token refresh before expiry
 *
 * Schedules a token refresh operation to occur shortly before
 * the access token expires. Dynamically imports the token
 * refresh module to avoid circular dependencies.
 *
 * This function:
 * - Calculates the optimal time to refresh (before expiry)
 * - Sets up a timer to trigger refresh at the right moment
 * - Ensures only one refresh timer is active at a time
 * - Logs scheduling information for debugging
 * - Handles timer creation errors gracefully
 *
 * @param expiresIn - Token lifetime in seconds
 * @returns Promise resolving when refresh is scheduled
 *
 * @example
 * // Schedule refresh after receiving new tokens
 * await scheduleTokenRefresh(3600); // 1 hour token
 * console.log("Token refresh scheduled for shortly before expiration");
 * @source
 */
export async function scheduleTokenRefresh(expiresIn: number): Promise<void> {
  const mod = await import("./storage/token-refresh");
  return mod.scheduleTokenRefresh(expiresIn);
}

// Export token initialization directly from storage modules
export { initTokenStore } from "./storage/token-init";

// Export session management functions
export { clearSpotifyAuthData } from "./session";

// Re-export credentials function
export { setCredentials } from "../spotify/credentials";

// Re-export token exchange function
export { exchangeCodeForTokens } from "../spotify/auth";
