/**
 * OAuth flow implementation
 *
 * Coordinates the complete OAuth 2.0 flow for Spotify authentication,
 * including launching the authentication window, managing the callback server,
 * and token exchange.
 */

import { URL } from "url";
import { BrowserWindow } from "electron";
import { saveLog } from "../../helpers/storage/logs-store";
import * as spotifyApi from "../spotify";
import { AuthTokens, CallbackHandlerOptions } from "@/types/auth";
import { clearSpotifyAuthData } from "./session";
import { createAuthWindow, closeAuthWindow } from "./window";
import { createCallbackServer, shutdownServer } from "./server";

// Authentication state
let isProcessingTokens = false;
let authPromiseReject: ((reason: Error) => void) | null = null;

/**
 * Starts the OAuth authentication flow
 *
 * @param parentWindow Parent window that owns the authentication dialog
 * @param clientId Spotify API client ID
 * @param clientSecret Spotify API client secret
 * @param redirectUri OAuth redirect URI for callback
 * @param forceAccountSelection Whether to force account selection screen
 * @returns Promise resolving to authentication tokens or rejecting with error
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
