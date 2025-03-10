/**
 * OAuth callback server implementation
 *
 * Creates a local HTTP server to handle the OAuth callback from Spotify.
 * This server captures the authorization code and exchanges it for access and refresh tokens.
 */

import { createServer, Server } from "http";
import { URL } from "url";
import { saveLog } from "../../helpers/storage/logs-store";
import * as spotifyApi from "../spotify";
import { CallbackHandlerOptions, AuthTokens } from "@/types/auth";

// Current server instance
let server: Server | null = null;

/**
 * Creates an HTTP server to handle the OAuth callback
 *
 * @param options Server configuration options
 * @param onSuccess Callback function for successful authentication
 * @param onError Callback function for authentication errors
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
