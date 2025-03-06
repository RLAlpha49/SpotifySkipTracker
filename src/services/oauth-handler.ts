import { BrowserWindow } from 'electron';
import { URL } from 'url';
import * as http from 'http';
import { saveLog } from '../helpers/storage/store';

let authWindow: BrowserWindow | null = null;
let server: http.Server | null = null;
let authPromiseReject: ((reason: Error) => void) | null = null;
let isProcessingTokens = false;

/**
 * Start the OAuth authentication flow
 */
export function startAuthFlow(
  parentWindow: BrowserWindow,
  clientId: string,
  clientSecret: string,
  redirectUri: string
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
      const reqUrl = new URL(req.url || '', `http://localhost:${port}`);
      const code = reqUrl.searchParams.get('code');
      const error = reqUrl.searchParams.get('error');
      
      if (error) {
        res.writeHead(400);
        res.end(`Authentication failed: ${error}`);
        saveLog(`Authentication failed: ${error}`, 'ERROR');
        reject(new Error(`Authentication failed: ${error}`));
        cleanup();
        return;
      }
      
      if (code) {
        // Set flag that we're processing tokens
        isProcessingTokens = true;
        
        // Send success response to browser
        res.writeHead(200, { 'Content-Type': 'text/html' });
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
                  background-color: rgba(0, 0, 0, 0.2);
                }
                h1 {
                  font-weight: 700;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Authentication Successful!</h1>
                <p>You can close this window and return to the application.</p>
              </div>
              <script>window.close();</script>
            </body>
          </html>
        `);
        
        // Process the authorization code
        exchangeCodeForTokens(code, clientId, clientSecret, redirectUri)
          .then(tokens => {
            saveLog('Successfully obtained access tokens', 'INFO');
            resolve(tokens);
            isProcessingTokens = false;
            cleanup();
          })
          .catch(err => {
            saveLog(`Error exchanging code for tokens: ${err}`, 'ERROR');
            reject(err);
            isProcessingTokens = false;
            cleanup();
          });
      } else {
        res.writeHead(400);
        res.end('Authorization code not found');
        saveLog('Authentication failed: No authorization code received', 'ERROR');
        reject(new Error('No authorization code received'));
        cleanup();
      }
    });
    
    server.listen(port, () => {
      saveLog(`OAuth callback server listening on port ${port}`, 'DEBUG');
      
      // Create and configure the auth window
      authWindow = new BrowserWindow({
        parent: parentWindow,
        modal: true,
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });
      
      // Generate authorization URL from Spotify API
      const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('user-read-playback-state user-library-read user-library-modify user-read-recently-played')}`;
      
      // Load the authorization URL
      authWindow.loadURL(authUrl);
      
      // Handle window closing
      authWindow.on('closed', () => {
        authWindow = null;
        
        // Only reject if we're not already processing tokens
        if (!isProcessingTokens) {
          saveLog('Authentication window closed by user', 'INFO');
          reject(new Error('Authentication cancelled by user'));
          cleanup();
        }
      });
    });
  });
}

/**
 * Clean up resources
 */
function cleanup(): void {
  if (server) {
    server.close();
    server = null;
  }
  
  if (authWindow && !authWindow.isDestroyed()) {
    authWindow.close();
    authWindow = null;
  }
  
  authPromiseReject = null;
}

/**
 * Cancel the authentication flow
 */
export function cancelAuthFlow(): void {
  if (authPromiseReject) {
    authPromiseReject(new Error('Authentication cancelled'));
  }
  
  cleanup();
}

/**
 * Exchange the authorization code for access tokens
 */
async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const { default: axios } = await import('axios');
  
  // Prepare the token request data
  const tokenRequestData = new URLSearchParams();
  tokenRequestData.append('grant_type', 'authorization_code');
  tokenRequestData.append('code', code);
  tokenRequestData.append('redirect_uri', redirectUri);
  
  // Create the authorization header (Basic auth with client ID and secret)
  const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', tokenRequestData, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    saveLog('Successfully exchanged authorization code for tokens', 'INFO');
    
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in
    };
  } catch (error) {
    saveLog(`Token exchange failed: ${error}`, 'ERROR');
    throw error;
  }
} 