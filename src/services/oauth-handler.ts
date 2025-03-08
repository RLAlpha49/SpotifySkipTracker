/**
 * Spotify OAuth authentication module
 *
 * Implements OAuth 2.0 authorization code flow for Spotify API authentication.
 * Creates a temporary HTTP server to capture the redirect callback and
 * manages the token exchange process.
 *
 * Authentication flow:
 * 1. Launch browser with Spotify authorization URL
 * 2. User authenticates and authorizes permissions
 * 3. Capture authorization code from redirect
 * 4. Exchange code for access/refresh tokens
 * 5. Return tokens to application
 */

import { BrowserWindow } from "electron";
import { URL } from "url";
import * as http from "http";
import { saveLog } from "../helpers/storage/store";
import * as spotifyApi from "./spotify-api";

// Authentication state tracking
let authWindow: BrowserWindow | null = null;
let server: http.Server | null = null;
let authPromiseReject: ((reason: Error) => void) | null = null;
let isProcessingTokens = false;

/**
 * Initiates OAuth authentication flow with Spotify
 *
 * @param parentWindow - Parent window for modal behavior
 * @param clientId - Spotify API client ID
 * @param clientSecret - Spotify API client secret
 * @param redirectUri - OAuth redirect URI matching Spotify app configuration
 * @returns Promise resolving to authentication tokens
 * @throws Error if authentication fails or is cancelled
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
    // Store reject function for external cancellation
    authPromiseReject = reject;

    // Extract port from redirect URI
    const redirectUrl = new URL(redirectUri);
    const port = parseInt(redirectUrl.port) || 8888;

    // Create callback server
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
        // Mark tokens as being processed
        isProcessingTokens = true;

        // Display success page
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

        // Exchange code for tokens
        exchangeCodeForTokens(code, clientId, clientSecret, redirectUri)
          .then((tokens) => {
            saveLog("Successfully retrieved tokens from Spotify", "DEBUG");
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

    // Start callback server
    server.listen(port, () => {
      saveLog(`OAuth server listening on port ${port}`, "DEBUG");

      // Generate authorization URL
      const authUrl = spotifyApi.getAuthorizationUrl(
        clientId,
        redirectUri,
        "user-read-playback-state user-library-modify user-read-recently-played user-library-read",
      );

      // Create authentication window
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

      // Handle window closure
      authWindow.on("closed", () => {
        authWindow = null;
        if (!isProcessingTokens) {
          saveLog("Authentication window closed by user", "DEBUG");
          reject(new Error("Authentication window closed by user"));
          cleanup();
        }
      });

      // Navigate to authorization page
      authWindow.loadURL(authUrl);
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
 * Releases resources used during authentication
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

  // Reset state variables
  authPromiseReject = null;
  isProcessingTokens = false;
}

/**
 * Terminates an active authentication flow
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
  return spotifyApi.exchangeCodeForTokens(
    code,
    clientId,
    clientSecret,
    redirectUri,
  );
}
