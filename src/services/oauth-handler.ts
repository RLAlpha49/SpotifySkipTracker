/**
 * OAuth Authentication Handler for Spotify
 *
 * This module manages the OAuth authentication flow with Spotify's API.
 * It creates a temporary local HTTP server to receive the authorization code
 * from Spotify's redirect, displays a user-friendly success page, and exchanges
 * the code for access and refresh tokens.
 *
 * The authentication flow follows these steps:
 * 1. Open a browser window to Spotify's authorization page
 * 2. User logs in and authorizes the application
 * 3. Spotify redirects back to our local server with an authorization code
 * 4. The server exchanges the code for access and refresh tokens
 * 5. The browser window closes and tokens are returned to the application
 */

import { BrowserWindow } from "electron";
import { URL } from "url";
import * as http from "http";
import { saveLog } from "../helpers/storage/store";

// State variables for the authentication process
let authWindow: BrowserWindow | null = null;
let server: http.Server | null = null;
let authPromiseReject: ((reason: Error) => void) | null = null;
let isProcessingTokens = false;

/**
 * Start the OAuth authentication flow with Spotify
 *
 * This function:
 * 1. Creates a local HTTP server to receive the authorization redirect
 * 2. Opens a browser window for the user to authenticate with Spotify
 * 3. Exchanges the received code for access and refresh tokens
 *
 * @param parentWindow - The main application window (for modal behavior)
 * @param clientId - Spotify Developer client ID
 * @param clientSecret - Spotify Developer client secret
 * @param redirectUri - Authorized redirect URI for the application
 * @returns Promise that resolves with access and refresh tokens when authentication completes
 */
export function startAuthFlow(
  parentWindow: BrowserWindow,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  return new Promise((resolve, reject) => {
    // Store the reject function so we can cancel from outside
    authPromiseReject = reject;

    // Parse the redirect URI to get the port
    const redirectUrl = new URL(redirectUri);
    const port = parseInt(redirectUrl.port) || 8888;

    // Create a local server to handle the redirect
    server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url || "", `http://localhost:${port}`);
      const code = reqUrl.searchParams.get("code");
      const error = reqUrl.searchParams.get("error");

      if (error) {
        res.writeHead(400);
        res.end(`Authentication failed: ${error}`);
        saveLog(`Authentication failed: ${error}`, "ERROR");
        reject(new Error(`Authentication failed: ${error}`));
        cleanup();
        return;
      }

      if (code) {
        // Set flag that we're processing tokens
        isProcessingTokens = true;

        // Send success response to browser
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Authentication Successful</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                  background-color: #f5f5f5;
                }
                .container {
                  text-align: center;
                  padding: 2rem;
                  border-radius: 8px;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                  background-color: white;
                }
                h1 {
                  color: #1DB954;
                  margin-bottom: 1rem;
                }
                p {
                  margin-bottom: 2rem;
                  color: #333;
                }
                .spinner {
                  width: 40px;
                  height: 40px;
                  margin: 0 auto;
                  border: 4px solid rgba(0, 0, 0, 0.1);
                  border-left-color: #1DB954;
                  border-radius: 50%;
                  animation: spin 1s linear infinite;
                }
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
                .backdrop {
                  position: fixed;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Authentication Successful</h1>
                <p>You have successfully authenticated with Spotify.<br>You can close this window now.</p>
                <div class="spinner"></div>
              </div>
              <script>
                // This window will be closed automatically
                setTimeout(() => window.close(), 3000);
              </script>
            </body>
          </html>
        `);

        // Exchange the code for tokens
        exchangeCodeForTokens(code, clientId, clientSecret, redirectUri)
          .then((tokens) => {
            saveLog("Successfully retrieved tokens from Spotify", "INFO");
            resolve(tokens);
          })
          .catch((err) => {
            saveLog(`Failed to exchange code for tokens: ${err}`, "ERROR");
            reject(err);
          })
          .finally(() => {
            cleanup();
          });
      } else {
        res.writeHead(400);
        res.end("No authorization code received from Spotify");
        saveLog("No authorization code received from Spotify", "ERROR");
        reject(new Error("No authorization code received from Spotify"));
        cleanup();
      }
    });

    // Start the HTTP server
    server.listen(port, () => {
      saveLog(`OAuth server listening on port ${port}`, "DEBUG");

      // Import dynamically to avoid circular dependencies
      import("./spotify-api").then((spotifyApi) => {
        // Get the authorization URL from the Spotify API
        const authUrl = spotifyApi.getAuthorizationUrl(
          clientId,
          redirectUri,
          "user-read-playback-state user-library-modify user-read-recently-played user-library-read",
        );

        // Create browser window for authentication
        authWindow = new BrowserWindow({
          width: 1000,
          height: 800,
          parent: parentWindow,
          modal: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        });

        // Handle window close events
        authWindow.on("closed", () => {
          authWindow = null;
          if (!isProcessingTokens) {
            saveLog("Authentication window closed by user", "INFO");
            reject(new Error("Authentication window closed by user"));
            cleanup();
          }
        });

        // Navigate to the Spotify authorization page
        authWindow.loadURL(authUrl);
      });
    });

    // Handle server errors
    server.on("error", (err) => {
      saveLog(`OAuth server error: ${err}`, "ERROR");
      reject(err);
      cleanup();
    });
  });
}

/**
 * Clean up resources after authentication flow completes or is cancelled
 * Closes the server and authentication window if they exist
 */
function cleanup(): void {
  if (server) {
    server.close();
    server = null;
    saveLog("OAuth server closed", "DEBUG");
  }

  if (authWindow && !authWindow.isDestroyed()) {
    authWindow.close();
    authWindow = null;
    saveLog("Authentication window closed", "DEBUG");
  }

  // Reset state
  authPromiseReject = null;
  isProcessingTokens = false;
}

/**
 * Cancel an ongoing authentication flow
 * This is useful when the application is closing or user cancels authentication
 */
export function cancelAuthFlow(): void {
  if (authPromiseReject) {
    authPromiseReject(new Error("Authentication flow cancelled"));
    saveLog("Authentication flow cancelled", "INFO");
  }
  cleanup();
}

/**
 * Exchange authorization code for access and refresh tokens
 *
 * @param code - Authorization code received from Spotify
 * @param clientId - Spotify Developer client ID
 * @param clientSecret - Spotify Developer client secret
 * @param redirectUri - Authorized redirect URI for the application
 * @returns Promise that resolves with the tokens
 */
async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const spotifyApi = await import("./spotify-api");
  return spotifyApi.exchangeCodeForTokens(
    code,
    clientId,
    clientSecret,
    redirectUri,
  );
}
