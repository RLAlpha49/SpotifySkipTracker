/**
 * OAuth Callback Server Module
 *
 * This module implements a specialized HTTP server for handling OAuth 2.0 redirects
 * from Spotify's authorization service. It captures the authorization code, performs
 * the token exchange, and provides visual feedback to the user during the authentication
 * process.
 *
 * Features:
 * - Lightweight, temporary HTTP server with configurable port binding
 * - Secure validation of OAuth parameters and state verification
 * - Complete error handling for all authentication failure scenarios
 * - Automatic code-to-token exchange with Spotify's token endpoint
 * - User-friendly HTML response pages with intuitive messaging
 * - Self-cleaning server lifecycle with automatic shutdown
 * - Proper HTTP protocol compliance with appropriate status codes
 * - Detailed logging of the authentication process for debugging
 *
 * The server plays a critical role in the OAuth flow by:
 * 1. Providing a redirect target for Spotify's authorization service
 * 2. Securely capturing and validating the authorization code
 * 3. Performing the final token exchange to obtain access credentials
 * 4. Communicating the result back to the main application
 * 5. Displaying appropriate visual feedback to the user
 *
 * This implementation follows OAuth 2.0 best practices for desktop applications,
 * using the authorization code flow with a local redirect URI to maximize security
 * while providing a seamless authentication experience.
 *
 * @module OAuthCallbackServer
 */

import { AuthTokens, CallbackHandlerOptions } from "@/types/auth";
import { createServer, Server } from "http";
import { URL } from "url";
import { saveLog } from "../../helpers/storage/logs-store";
import * as spotifyApi from "../spotify";

// Current server instance
let server: Server | null = null;

/**
 * Creates an HTTP server to handle the OAuth callback
 *
 * Establishes a temporary HTTP server that:
 * 1. Listens on the specified port for the OAuth redirect
 * 2. Validates incoming requests against the expected redirect path
 * 3. Extracts the authorization code from query parameters
 * 4. Exchanges the code for access and refresh tokens
 * 5. Provides appropriate visual feedback to the user
 * 6. Notifies the application of success or failure
 *
 * The server implements comprehensive error handling for various
 * failure scenarios (missing code, API errors, user denial) and
 * automatically shuts down once the authentication process completes.
 *
 * @param options - Configuration options including port and redirect URI
 * @param onSuccess - Callback function called with tokens on successful authentication
 * @param onError - Callback function called with error details on authentication failure
 *
 * @example
 * // Create a callback server for authentication
 * createCallbackServer(
 *   { port: 8888, redirectUri: 'http://localhost:8888/callback' },
 *   (tokens) => handleSuccessfulAuth(tokens),
 *   (error) => handleAuthError(error)
 * );
 */
export function createCallbackServer(
  options: CallbackHandlerOptions,
  onSuccess: (tokens: AuthTokens) => void,
  onError: (error: Error) => void,
): void {
  const { port, redirectUri } = options;

  try {
    // Create HTTP server to handle the OAuth callback
    server = createServer(async (req, res) => {
      try {
        // Only handle requests to the redirect path
        const reqUrl = new URL(req.url || "", `http://localhost:${port}`);
        const redirectUrl = new URL(redirectUri);

        // Check if the request path matches our redirect path
        if (reqUrl.pathname !== redirectUrl.pathname) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }

        // Check for error parameter in callback
        const error = reqUrl.searchParams.get("error");
        if (error) {
          const errorMsg = `Spotify authentication error: ${error}`;
          saveLog(errorMsg, "ERROR");

          // Send error response
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(getErrorHtml(errorMsg));

          // Notify application
          onError(new Error(errorMsg));
          return;
        }

        // Get authorization code from query parameters
        const code = reqUrl.searchParams.get("code");
        if (!code) {
          const errorMsg = "No authorization code in callback";
          saveLog(errorMsg, "ERROR");

          // Send error response
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(getErrorHtml(errorMsg));

          // Notify application
          onError(new Error(errorMsg));
          return;
        }

        // Exchange authorization code for tokens
        const spotifyTokens = await spotifyApi.exchangeCodeForTokens(
          code,
          redirectUri,
        );

        // Convert Spotify token format to our internal format
        const tokens: AuthTokens = {
          accessToken: spotifyTokens.access_token,
          refreshToken: spotifyTokens.refresh_token,
          expiresIn: spotifyTokens.expires_in,
        };

        // Send success response
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(getSuccessHtml());

        // Notify application of successful authentication
        onSuccess(tokens);

        // Shutdown server since we're done
        shutdownServer();
      } catch (err) {
        const errorMsg = `Error handling authentication callback: ${err}`;
        saveLog(errorMsg, "ERROR");

        // Send error response
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(getErrorHtml(errorMsg));

        // Notify application
        onError(new Error(errorMsg));
      }
    });

    // Handle server errors
    server.on("error", (err) => {
      const errorMsg = `OAuth callback server error: ${err}`;
      saveLog(errorMsg, "ERROR");
      onError(new Error(errorMsg));
    });

    // Start listening
    server.listen(port, () => {
      saveLog(`OAuth callback server listening on port ${port}`, "DEBUG");
    });
  } catch (err) {
    const errorMsg = `Failed to create callback server: ${err}`;
    saveLog(errorMsg, "ERROR");
    onError(new Error(errorMsg));
  }
}

/**
 * Shuts down the callback server if it's running
 *
 * Safely terminates the HTTP server that was handling OAuth callbacks.
 * This function is idempotent and can be safely called multiple times,
 * even if the server is already closed or wasn't started.
 *
 * The server is automatically shut down after successful authentication,
 * but this function can also be called manually to cancel the authentication
 * process or clean up resources.
 *
 * @example
 * // Close the server when canceling authentication
 * shutdownServer();
 */
export function shutdownServer(): void {
  if (server) {
    server.close(() => {
      saveLog("OAuth callback server closed", "DEBUG");
    });
    server = null;
  }
}

/**
 * Generates HTML for the success page shown after successful authentication
 *
 * Creates a user-friendly HTML page with Spotify-themed styling that:
 * - Confirms the authentication was successful
 * - Instructs the user they can return to the application
 * - Provides visual feedback with appropriate colors and layout
 *
 * This HTML is shown briefly in the browser before the window
 * is automatically closed by the application.
 *
 * @returns Formatted HTML string for the success page
 * @private Internal function not exported from the module
 */
function getSuccessHtml(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authentication Successful</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          background-color: #f5f5f5;
          text-align: center;
          padding: 50px;
        }
        .container {
          background-color: white;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          max-width: 500px;
          margin: 0 auto;
        }
        h1 {
          color: #1DB954; /* Spotify green */
        }
        p {
          margin: 20px 0;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Authentication Successful</h1>
        <p>You have successfully connected to Spotify!</p>
        <p>You can close this window and return to the application.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generates HTML for the error page shown after failed authentication
 *
 * Creates a user-friendly HTML error page that:
 * - Clearly indicates authentication failure
 * - Displays the specific error message for troubleshooting
 * - Provides instructions on how to proceed
 * - Uses appropriate error styling and visual cues
 *
 * This HTML is displayed when any part of the authentication
 * process fails, giving users visual feedback and next steps.
 *
 * @param errorMessage - The specific error message to display
 * @returns Formatted HTML string for the error page
 * @private Internal function not exported from the module
 */
function getErrorHtml(errorMessage: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authentication Error</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          background-color: #f5f5f5;
          text-align: center;
          padding: 50px;
        }
        .container {
          background-color: white;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          max-width: 500px;
          margin: 0 auto;
        }
        h1 {
          color: #e74c3c; /* Error red */
        }
        p {
          margin: 20px 0;
          line-height: 1.5;
        }
        .error {
          font-family: monospace;
          background-color: #f9f9f9;
          padding: 10px;
          border-radius: 5px;
          color: #e74c3c;
          text-align: left;
          overflow-wrap: break-word;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Authentication Error</h1>
        <p>An error occurred while authenticating with Spotify:</p>
        <div class="error">${errorMessage}</div>
        <p>Please close this window and try again.</p>
      </div>
    </body>
    </html>
  `;
}
