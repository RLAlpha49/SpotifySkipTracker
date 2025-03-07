/**
 * Spotify API Service
 *
 * This module provides functions for interacting with the Spotify Web API.
 * It handles authentication, token management, and various API requests
 * related to user playback, library management, and track information.
 *
 * The service maintains token state in memory and provides methods to:
 * - Authenticate users via OAuth
 * - Refresh access tokens automatically
 * - Get current playback information
 * - Check track library status
 * - Manage user's saved tracks
 *
 * Note: This service requires Spotify Developer credentials to function.
 */

import axios from "axios";
import querystring from "querystring";
import { saveLog } from "../helpers/storage/store";
import { retryApiCall } from "./api-retry";

// Spotify API endpoints
const AUTH_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE_URL = "https://api.spotify.com/v1";

// Token storage (in-memory)
let accessToken: string | null = null;
let refreshToken: string | null = null;
let tokenExpiryTime: number = 0;

// Define types for Spotify API responses
/**
 * Represents an image from the Spotify API
 */
interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

/**
 * External URLs for Spotify resources
 */
interface SpotifyExternalUrls {
  spotify: string;
}

/**
 * Follower information for Spotify users
 */
interface SpotifyFollowers {
  href: string | null;
  total: number;
}

/**
 * User profile information from Spotify
 */
interface SpotifyUserProfile {
  country: string;
  display_name: string;
  email: string;
  explicit_content: {
    filter_enabled: boolean;
    filter_locked: boolean;
  };
  external_urls: SpotifyExternalUrls;
  followers: SpotifyFollowers;
  href: string;
  id: string;
  images: SpotifyImage[];
  product: string;
  type: string;
  uri: string;
}

/**
 * Artist information from Spotify
 */
interface SpotifyArtist {
  external_urls: SpotifyExternalUrls;
  href: string;
  id: string;
  name: string;
  type: string;
  uri: string;
}

/**
 * Album information from Spotify
 */
interface SpotifyAlbum {
  album_type: string;
  artists: SpotifyArtist[];
  available_markets: string[];
  external_urls: SpotifyExternalUrls;
  href: string;
  id: string;
  images: SpotifyImage[];
  name: string;
  release_date: string;
  release_date_precision: string;
  total_tracks: number;
  type: string;
  uri: string;
}

/**
 * Track information from Spotify
 */
interface SpotifyTrack {
  album: SpotifyAlbum;
  artists: SpotifyArtist[];
  available_markets: string[];
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  external_ids: { isrc: string };
  external_urls: SpotifyExternalUrls;
  href: string;
  id: string;
  is_local: boolean;
  name: string;
  popularity: number;
  preview_url: string;
  track_number: number;
  type: string;
  uri: string;
}

/**
 * Playback device information from Spotify
 */
interface SpotifyDevice {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
}

/**
 * Current playback state information from Spotify
 * Contains information about the currently playing track, device, and playback settings
 */
interface SpotifyPlaybackState {
  device: SpotifyDevice;
  repeat_state: string;
  shuffle_state: boolean;
  context: {
    type: string;
    href: string;
    external_urls: SpotifyExternalUrls;
    uri: string;
  } | null;
  timestamp: number;
  progress_ms: number;
  is_playing: boolean;
  item: SpotifyTrack;
  currently_playing_type: string;
  actions: {
    disallows: Record<string, boolean>;
  };
}

/**
 * Play history information from Spotify
 * Contains information about a track that was played and when it was played
 */
interface SpotifyPlayHistory {
  track: SpotifyTrack;
  played_at: string;
  context: {
    type: string;
    href: string;
    external_urls: SpotifyExternalUrls;
    uri: string;
  } | null;
}

/**
 * Response format for recently played tracks from Spotify
 * Contains a list of recently played tracks and pagination information
 */
interface SpotifyRecentlyPlayedResponse {
  items: SpotifyPlayHistory[];
  next: string | null;
  cursors: {
    after: string;
    before: string;
  };
  limit: number;
  href: string;
}

/**
 * Generate the authorization URL for Spotify OAuth
 *
 * @param clientId - Spotify Developer client ID
 * @param redirectUri - Authorized redirect URI for the application
 * @param scope - Space-separated list of Spotify API permission scopes
 * @returns Complete authorization URL to redirect the user to
 */
export function getAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  scope: string = "user-read-playback-state user-library-modify user-read-recently-played",
): string {
  const authQuery = {
    response_type: "code",
    client_id: clientId,
    scope: scope,
    redirect_uri: redirectUri,
  };

  const queryParams = querystring.stringify(authQuery);
  return `${AUTH_URL}?${queryParams}`;
}

/**
 * Exchange authorization code for access and refresh tokens
 *
 * @param code - Authorization code received from Spotify after user authorizes
 * @param clientId - Spotify Developer client ID
 * @param clientSecret - Spotify Developer client secret
 * @param redirectUri - Authorized redirect URI for the application
 * @returns Object containing accessToken, refreshToken, and expiration time
 * @throws Error if token exchange fails
 */
export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
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

    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token;
    tokenExpiryTime = Date.now() + response.data.expires_in * 1000;

    saveLog("Successfully exchanged authorization code for tokens", "DEBUG");

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
    };
  } catch (error) {
    saveLog(`Failed to exchange code for tokens: ${error}`, "ERROR");
    throw error;
  }
}

/**
 * Refresh the access token using the refresh token
 *
 * @param clientId - Spotify Developer client ID
 * @param clientSecret - Spotify Developer client secret
 * @returns New access token
 * @throws Error if refresh fails or no refresh token is available
 */
export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<string | never> {
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  try {
    const response = await axios.post(
      TOKEN_URL,
      querystring.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    accessToken = response.data.access_token;
    tokenExpiryTime = Date.now() + response.data.expires_in * 1000;

    // If we receive a new refresh token, update it
    if (response.data.refresh_token) {
      refreshToken = response.data.refresh_token;
    }

    saveLog("Successfully refreshed access token", "DEBUG");

    // Make sure we never return null here
    if (!accessToken) {
      throw new Error("Failed to get access token from response");
    }

    return accessToken as string;
  } catch (error) {
    // Log this as a warning initially, since it will be retried by the retryApiCall function
    saveLog(`Failed to refresh access token: ${error}`, "WARNING");
    throw error;
  }
}

/**
 * Check if the current token is valid and not expired
 *
 * @returns True if the token is valid, false otherwise
 */
export function isTokenValid(): boolean {
  return !!accessToken && Date.now() < tokenExpiryTime;
}

/**
 * Set tokens directly (e.g., from stored values)
 *
 * @param newAccessToken - Spotify API access token
 * @param newRefreshToken - Spotify API refresh token
 * @param expiresIn - Expiration time in seconds
 */
export function setTokens(
  newAccessToken: string,
  newRefreshToken: string,
  expiresIn: number,
): void {
  accessToken = newAccessToken;
  refreshToken = newRefreshToken;
  tokenExpiryTime = Date.now() + expiresIn * 1000;
}

/**
 * Clear tokens (for logout)
 */
export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  tokenExpiryTime = 0;
}

/**
 * Get the current user's Spotify profile
 *
 * @param clientId - Spotify Developer client ID
 * @param clientSecret - Spotify Developer client secret
 * @returns User profile data
 * @throws Error if API request fails after all retry attempts
 */
export async function getCurrentUser(
  clientId: string,
  clientSecret: string,
): Promise<SpotifyUserProfile> {
  await ensureValidToken(clientId, clientSecret);

  return retryApiCall(async () => {
    const response = await axios.get(`${API_BASE_URL}/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  });
}

/**
 * Get the user's current playback state
 *
 * @param clientId - Spotify Developer client ID
 * @param clientSecret - Spotify Developer client secret
 * @returns Current playback state or null if nothing is playing
 * @throws Error if API request fails after all retry attempts
 */
export async function getCurrentPlayback(
  clientId: string,
  clientSecret: string,
): Promise<SpotifyPlaybackState | null> {
  await ensureValidToken(clientId, clientSecret);

  return retryApiCall(async () => {
    const response = await axios.get(`${API_BASE_URL}/me/player`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // No active playback returns 204 No Content
    if (response.status === 204) {
      return null;
    }

    return response.data;
  });
}

/**
 * Get the user's recently played tracks
 *
 * @param clientId - Spotify Developer client ID
 * @param clientSecret - Spotify Developer client secret
 * @param limit - Maximum number of tracks to return (default: 5)
 * @returns Recently played tracks data
 * @throws Error if API request fails after all retry attempts
 */
export async function getRecentlyPlayedTracks(
  clientId: string,
  clientSecret: string,
  limit: number = 5,
): Promise<SpotifyRecentlyPlayedResponse> {
  await ensureValidToken(clientId, clientSecret);

  return retryApiCall(async () => {
    const response = await axios.get(
      `${API_BASE_URL}/me/player/recently-played`,
      {
        params: { limit },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    return response.data;
  });
}

/**
 * Check if a track is in the user's saved tracks (library)
 *
 * @param clientId - Spotify Developer client ID
 * @param clientSecret - Spotify Developer client secret
 * @param trackId - Spotify track ID to check
 * @returns True if the track is in the user's library, false otherwise
 */
export async function isTrackInLibrary(
  clientId: string,
  clientSecret: string,
  trackId: string,
): Promise<boolean> {
  await ensureValidToken(clientId, clientSecret);

  try {
    return await retryApiCall(async () => {
      const response = await axios.get(`${API_BASE_URL}/me/tracks/contains`, {
        params: { ids: trackId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data[0] || false;
    });
  } catch (error) {
    // Handle all errors by returning false rather than throwing
    saveLog(
      `Failed to check if track is in library after multiple attempts: ${error}`,
      "WARNING",
    );
    return false;
  }
}

/**
 * Unlike (remove from library) a track
 *
 * @param clientId - Spotify Developer client ID
 * @param clientSecret - Spotify Developer client secret
 * @param trackId - Spotify track ID to remove
 * @returns True if successful, false otherwise
 */
export async function unlikeTrack(
  clientId: string,
  clientSecret: string,
  trackId: string,
): Promise<boolean> {
  await ensureValidToken(clientId, clientSecret);

  try {
    await retryApiCall(async () => {
      await axios.delete(`${API_BASE_URL}/me/tracks`, {
        params: { ids: trackId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    });
    saveLog(`Removed track ${trackId} from library`, "INFO");
    return true;
  } catch (error) {
    saveLog(
      `Failed to remove track from library after multiple attempts: ${error}`,
      "ERROR",
    );
    return false;
  }
}

/**
 * Ensure the token is valid before making API calls
 * If the token is expired, attempt to refresh it automatically
 *
 * @param clientId - Spotify Developer client ID
 * @param clientSecret - Spotify Developer client secret
 * @throws Error if no valid token or refresh token is available after retries
 */
async function ensureValidToken(
  clientId: string,
  clientSecret: string,
): Promise<void> {
  if (!isTokenValid()) {
    if (refreshToken) {
      try {
        await retryApiCall(
          async () => {
            await refreshAccessToken(clientId, clientSecret);
          },
          3, // Fewer retries for token refresh
        );
      } catch (error) {
        throw new Error(
          `Failed to refresh token after multiple attempts: ${error}`,
        );
      }
    } else {
      throw new Error("No valid token or refresh token available");
    }
  }
}

/**
 * Get current token information
 *
 * @returns Object containing accessToken, refreshToken, and expiryTime
 */
export function getTokenInfo(): {
  accessToken: string | null;
  refreshToken: string | null;
  expiryTime: number;
} {
  return {
    accessToken,
    refreshToken,
    expiryTime: tokenExpiryTime,
  };
}
