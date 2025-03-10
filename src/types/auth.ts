/**
 * Auth service type definitions
 *
 * Contains all types, interfaces, and enums used throughout the auth service modules.
 */

import { BrowserWindow } from "electron";

/**
 * Authentication configuration settings
 */
export interface AuthConfig {
  /** Spotify API client ID */
  clientId: string;

  /** Spotify API client secret */
  clientSecret: string;

  /** OAuth redirect URI */
  redirectUri: string;

  /** Whether to force account selection on login */
  forceAccountSelection?: boolean;
}

/**
 * Authentication tokens returned after successful OAuth flow
 */
export interface AuthTokens {
  /** Spotify API access token */
  accessToken: string;

  /** Spotify API refresh token */
  refreshToken: string;

  /** Seconds until the access token expires */
  expiresIn: number;
}

/**
 * Raw token response from Spotify API
 */
export interface SpotifyTokenResponse {
  /** Spotify API access token */
  access_token: string;

  /** Spotify API refresh token */
  refresh_token: string;

  /** Seconds until the access token expires */
  expires_in: number;

  /** Token type, usually "Bearer" */
  token_type: string;

  /** OAuth scope granted to this token */
  scope: string;
}

/**
 * Configuration for the OAuth callback server
 */
export interface CallbackHandlerOptions {
  /** Port to listen on for the OAuth callback */
  port: number;

  /** Parent window that spawned the auth flow */
  parentWindow: BrowserWindow;

  /** OAuth redirect URI for callbacks */
  redirectUri: string;
}
