/**
 * Auth service export module
 *
 * Provides a unified interface to the auth service functionality,
 * exposing the necessary functions and types for external use.
 */

// Export window management functions
export {
  createAuthWindow,
  closeAuthWindow,
  hasActiveAuthWindow,
} from "./window";

// Export server functions
export { createCallbackServer, shutdownServer } from "./server";

// Export OAuth flow functions
export { startAuthFlow, cancelAuthFlow } from "./oauth";

// Export token management functions directly from storage modules
export {
  setTokens,
  getAccessToken,
  getRefreshToken,
  getTokenExpiry,
  clearTokens,
  isAuthenticated,
} from "./storage/token-operations";

// Export token refresh functions directly from storage modules
export {
  refreshAccessToken,
  scheduleTokenRefresh,
} from "./storage/token-refresh";

// Export token initialization directly from storage modules
export { initTokenStore } from "./storage/token-init";

// Export session management functions
export { clearSpotifyAuthData } from "./session";

// Re-export credentials function
export { setCredentials } from "../spotify/credentials";

// Re-export token exchange function
export { exchangeCodeForTokens } from "../spotify/auth";
