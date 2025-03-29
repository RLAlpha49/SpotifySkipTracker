/**
 * @packageDocumentation
 * @module spotify/auth
 * @description Spotify API Authentication Service
 *
 * This module handles the OAuth 2.0 authentication process with Spotify's Web API,
 * including authorization URL generation, token exchange, and authentication flow management.
 *
 * Features:
 * - OAuth 2.0 authorization code flow implementation
 * - Authorization URL generation with configurable scopes
 * - Secure token exchange process
 * - Automatic token storage upon successful authentication
 * - Comprehensive error handling during authentication
 * - Security features including state parameter support
 *
 * Usage:
 * ```typescript
 * import { getAuthorizationUrl, exchangeCodeForTokens } from '@/services/spotify/auth';
 *
 * // Generate the authorization URL for the user to visit
 * const redirectUri = 'http://localhost:3000/callback';
 * const scopes = ['user-read-playback-state', 'user-modify-playback-state'];
 * const authUrl = getAuthorizationUrl(redirectUri, scopes);
 *
 * // After redirect, exchange the received code for tokens
 * const tokens = await exchangeCodeForTokens(code, redirectUri);
 * ```
 *
 * @module SpotifyAuthentication
 */

import { SpotifyTokens } from "@/types/spotify-api";
import axios from "axios";
import querystring from "querystring";
import { saveLog } from "../../helpers/storage/logs-store";
import { AUTH_URL, TOKEN_URL } from "./constants";
import { ensureCredentialsSet, getCredentials } from "./credentials";
import { setTokens } from "./token";

/**
 * Generates the authorization URL for initiating OAuth flow
 *
 * @param redirectUri - OAuth callback URI
 * @param scopes - Array of permission scopes or space-separated string
 * @param state - Optional state parameter for security validation
 * @returns Full authorization URL for redirect
 * @source
 */
export function getAuthorizationUrl(
  redirectUri: string,
  scopes: string[] | string,
  state?: string,
): string {
  ensureCredentialsSet();

  // Convert scopes to string if it's an array, or ensure it's a string if not
  const scopeString = Array.isArray(scopes) ? scopes.join(" ") : scopes;
  const { clientId } = getCredentials();

  const params = {
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopeString,
    state: state || "",
  };

  return `${AUTH_URL}?${querystring.stringify(params)}`;
}

/**
 * Exchanges authorization code for access and refresh tokens
 *
 * @param code - Authorization code from OAuth callback
 * @param redirectUri - OAuth callback URI (must match authorization request)
 * @returns Promise resolving to token response
 * @throws Error if token exchange fails
 * @source
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<SpotifyTokens> {
  ensureCredentialsSet();

  const { clientId, clientSecret } = getCredentials();

  try {
    const response = await axios.post(
      TOKEN_URL,
      querystring.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const { access_token, refresh_token, expires_in } = response.data;

    // Store tokens internally
    setTokens(access_token, refresh_token, expires_in);

    saveLog("Successfully exchanged code for tokens", "DEBUG");
    return response.data;
  } catch (error: unknown) {
    const err = error as Error;
    saveLog(`Failed to exchange code for tokens: ${err.message}`, "ERROR");
    throw new Error(`Failed to exchange code for tokens: ${err.message}`);
  }
}
