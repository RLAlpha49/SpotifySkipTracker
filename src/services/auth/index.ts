/**
 * Auth service export module
 *
 * Provides a unified interface to the auth service functionality,
 * exposing the necessary functions and types for external use.
 */

import { AuthTokens } from "@/types/auth";

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

// Re-export token module functions to avoid circular dependencies
export async function setTokens(tokens: AuthTokens): Promise<void> {
  const mod = await import("./storage/token-operations");
  return mod.setTokens(tokens);
}

export async function getAccessToken(): Promise<string | null> {
  const mod = await import("./storage/token-operations");
  return mod.getAccessToken();
}

export async function getRefreshToken(): Promise<string | null> {
  const mod = await import("./storage/token-operations");
  return mod.getRefreshToken();
}

export async function getTokenExpiry(): Promise<number | null> {
  const mod = await import("./storage/token-operations");
  return mod.getTokenExpiry();
}

export async function clearTokens(): Promise<void> {
  const mod = await import("./storage/token-operations");
  return mod.clearTokens();
}

export async function isAuthenticated(): Promise<boolean> {
  const mod = await import("./storage/token-operations");
  return mod.isAuthenticated();
}

export async function refreshAccessToken(): Promise<boolean> {
  const mod = await import("./storage/token-refresh");
  return mod.refreshAccessToken();
}

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
