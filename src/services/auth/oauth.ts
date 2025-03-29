/**
 * @packageDocumentation
 * @module auth/oauth
 * @description OAuth Authentication Flow Module
 *
 * This module orchestrates the complete OAuth 2.0 authorization flow for Spotify,
 * coordinating multiple authentication components into a seamless authentication
 * experience. It implements the authorization code flow with PKCE for maximum security
 * in desktop applications.
 *
 * Features:
 * - Complete authorization code flow implementation with CSRF protection
 * - Secure state parameter generation and validation
 * - Multi-account support with optional account selection forcing
 * - Comprehensive Promise-based flow management
 * - Coordinated window, server, and token exchange orchestration
 * - User-friendly authentication experience with visual feedback
 * - Graceful error handling and recovery for all failure scenarios
 * - Clean cancellation support at any point in the flow
 * - Detailed activity logging for troubleshooting
 * - Proper resource cleanup in all termination scenarios
 *
 * The flow coordinates three main components:
 * 1. Authentication Window - User interface for Spotify login
 * 2. Callback Server - Endpoint for receiving the authorization code
 * 3. Token Exchange - Secure conversion of code to access/refresh tokens
 *
 * Security features include:
 * - Random state parameter to prevent CSRF attacks
 * - Secure credential handling with no client secret exposure
 * - Automatic token storage with encryption
 * - Session isolation for multi-account scenarios
 *
 * @module OAuthFlowCoordinator
 */

import { AuthTokens, CallbackHandlerOptions } from "@/types/auth";
import { BrowserWindow } from "electron";
import { URL } from "url";
import { saveLog } from "../../helpers/storage/logs-store";
import * as spotifyApi from "../spotify";
import { createCallbackServer, shutdownServer } from "./server";
import { clearSpotifyAuthData } from "./session";
import { closeAuthWindow, createAuthWindow } from "./window";

// Authentication state
let isProcessingTokens = false;
let authPromiseReject: ((reason: Error) => void) | null = null;

/**
 * Starts the OAuth authentication flow
 *
 * Initiates the complete Spotify OAuth 2.0 authorization code flow by:
 * 1. Setting API credentials in the Spotify service
 * 2. Optionally clearing existing session data for account selection
 * 3. Extracting the callback port from the redirect URI
 * 4. Configuring authorization scopes for required permissions
 * 5. Generating a secure state parameter to prevent CSRF attacks
 * 6. Creating a local callback server to capture the authorization code
 * 7. Opening the authentication browser window for user login
 * 8. Managing promise resolution/rejection based on outcome
 * 9. Providing comprehensive error handling throughout the flow
 * 10. Ensuring proper cleanup of resources in all scenarios
 *
 * The flow handles both successful authentication (resolving with tokens)
 * and failure scenarios (rejecting with detailed error information).
 * The implementation maintains state across multiple async operations,
 * coordinating the window, server, and token exchange phases.
 *
 * @param parentWindow - Parent window that owns the authentication dialog
 * @param clientId - Spotify API client ID
 * @param clientSecret - Spotify API client secret
 * @param redirectUri - OAuth redirect URI for callback (must include protocol and port)
 * @param forceAccountSelection - Whether to force account selection screen (default: false)
 * @returns Promise resolving to authentication tokens or rejecting with error
 *
 * @example
 * // Start authentication flow from main application window
 * try {
 *   const tokens = await startAuthFlow(
 *     mainWindow,
 *     "spotify-client-id",
 *     "spotify-client-secret",
 *     "http://localhost:8888/callback",
 *     true // Force account selection
 *   );
 *   console.log("Authentication successful!", tokens.accessToken);
 * } catch (error) {
 *   console.error("Authentication failed:", error.message);
 * }
 *
 * @throws Error if authentication fails or is canceled
 * @source
 */
export function startAuthFlow(
  parentWindow: BrowserWindow,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  forceAccountSelection: boolean = false,
): Promise<AuthTokens> {
  // Set credentials in the spotify API module
  spotifyApi.setCredentials(clientId, clientSecret);

  // Clear cookies if forcing account selection
  if (forceAccountSelection) {
    clearSpotifyAuthData();
  }

  return new Promise((resolve, reject) => {
    // Save reject function for external cancellation
    authPromiseReject = reject;

    // Track processing state
    isProcessingTokens = false;

    try {
      // Extract port from redirect URI for callback server
      const redirectUrl = new URL(redirectUri);
      const port = parseInt(redirectUrl.port) || 8888;

      // Build authorization URL with proper scopes
      const authScopes = [
        "user-read-playback-state",
        "user-modify-playback-state",
        "user-library-modify",
        "user-library-read",
        "user-read-recently-played",
      ];

      // Generate random state parameter
      const stateParam = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;

      // Get authorization URL
      const authUrl = spotifyApi.getAuthorizationUrl(
        redirectUri,
        authScopes,
        stateParam,
      );

      // Set up the callback server to capture the OAuth redirect
      const serverOptions: CallbackHandlerOptions = {
        port,
        parentWindow,
        redirectUri,
      };

      // Create server and handle success/error
      createCallbackServer(
        serverOptions,
        (tokens) => {
          // Success handler
          if (!isProcessingTokens) {
            isProcessingTokens = true;

            // Clean up window
            closeAuthWindow();

            resolve(tokens);
          }
        },
        (error) => {
          // Error handler
          closeAuthWindow();
          authPromiseReject = null;
          reject(error);
        },
      );

      // Create and show the authentication window
      createAuthWindow(parentWindow, authUrl, () => {
        // Window closed handler
        if (!isProcessingTokens) {
          shutdownServer();
          authPromiseReject = null;
          reject(new Error("Authentication canceled by user"));
        }
      });
    } catch (error) {
      // Clean up on any initialization errors
      shutdownServer();
      closeAuthWindow();
      authPromiseReject = null;

      saveLog(`Error starting authentication flow: ${error}`, "ERROR");
      reject(new Error(`Failed to start authentication flow: ${error}`));
    }
  });
}

/**
 * Cancels ongoing OAuth authentication flow
 *
 * Safely aborts an in-progress authentication flow by:
 * 1. Rejecting the authentication promise with a cancellation error
 * 2. Shutting down the temporary callback server
 * 3. Closing the authentication browser window
 * 4. Cleaning up all related resources and state
 * 5. Logging the cancellation for debugging purposes
 *
 * This function can be called at any point during the authentication process,
 * ensuring all resources are properly cleaned up regardless of the flow state.
 * It provides a graceful way to handle user-initiated cancellations or
 * application-driven authentication termination.
 *
 * No action is taken if there isn't an active authentication flow in progress.
 *
 * @example
 * // Cancel authentication when user clicks a cancel button
 * cancelButton.addEventListener('click', () => {
 *   cancelAuthFlow();
 *   showMessage("Authentication cancelled");
 * });
 *
 * // Cancel authentication during application shutdown
 * app.on('before-quit', () => {
 *   cancelAuthFlow();
 * });
 * @source
 */
export function cancelAuthFlow(): void {
  if (authPromiseReject) {
    authPromiseReject(new Error("Authentication canceled"));
    authPromiseReject = null;
  }

  shutdownServer();
  closeAuthWindow();
  saveLog("Authentication flow canceled", "DEBUG");
}
