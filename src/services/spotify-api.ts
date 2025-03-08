/**
 * Spotify Web API integration module
 *
 * Provides comprehensive integration with Spotify Web API including authentication flows,
 * playback control, library management, and profile data access. Handles token lifecycle
 * and implements request retry mechanisms.
 *
 * Core components:
 * - OAuth authentication and authorization
 * - Token management and automatic refresh
 * - Playback state monitoring
 * - Library/collection management
 * - User profile access
 */

import axios from "axios";
import querystring from "querystring";
import { saveLog } from "../helpers/storage/store";
import { retryApiCall } from "./api-retry";

// API endpoints
const AUTH_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE_URL = "https://api.spotify.com/v1";

// Token state management
let accessToken: string | null = null;
let refreshToken: string | null = null;
let tokenExpiryTime: number = 0;

// API response interfaces
/**
 * Spotify image metadata
 */
interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

/**
 * External URL references for Spotify entities
 */
interface SpotifyExternalUrls {
  spotify: string;
}

/**
 * Follower metadata for Spotify users
 */
interface SpotifyFollowers {
  href: string | null;
  total: number;
}

/**
 * Comprehensive user profile from Spotify API
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
 * Artist metadata from Spotify API
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
 * Album metadata from Spotify API
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
 * Track metadata from Spotify API
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
 * Playback device metadata from Spotify API
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
 * Current playback session information
 * Includes active device, track, context, and playback settings
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
 * Track play history item
 * Represents a single played track with timestamp and context
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
 * Response structure for recently played tracks endpoint
 * Includes track history and pagination controls
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
 * Constructs Spotify OAuth authorization URL
 *
 * @param clientId - Spotify application client ID
 * @param redirectUri - OAuth callback URI registered in Spotify dashboard
 * @param scope - Space-separated OAuth permission scopes (default includes playback, library, history access)
 * @returns Complete authorization URL for initiating OAuth flow
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
 * Exchanges authorization code for access and refresh tokens
 *
 * @param code - OAuth authorization code from redirect callback
 * @param clientId - Spotify application client ID
 * @param clientSecret - Spotify application client secret
 * @param redirectUri - OAuth callback URI matching the authorization request
 * @returns Object containing access token, refresh token, and expiration time
 * @throws Error on failed token exchange or invalid response
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
 * Refreshes expired access token using stored refresh token
 *
 * @param clientId - Spotify application client ID
 * @param clientSecret - Spotify application client secret
 * @returns New access token
 * @throws Error if refresh operation fails or no refresh token is available
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
 * Validates if current access token is valid and not expired
 *
 * @returns Token validity status
 */
export function isTokenValid(): boolean {
  return !!accessToken && Date.now() < tokenExpiryTime;
}

/**
 * Sets authentication tokens directly
 * Useful for restoring tokens from persistent storage
 *
 * @param newAccessToken - Spotify API access token
 * @param newRefreshToken - Spotify API refresh token
 * @param expiresIn - Token lifetime in seconds
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
 * Clears authentication tokens
 * Used during logout or token invalidation
 */
export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  tokenExpiryTime = 0;
}

/**
 * Retrieves current user profile information
 *
 * @param clientId - Spotify application client ID
 * @param clientSecret - Spotify application client secret
 * @returns User profile data containing account details and preferences
 * @throws Error if API request fails after exhausting retry attempts
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
 * Retrieves current playback state information
 *
 * @param clientId - Spotify application client ID
 * @param clientSecret - Spotify application client secret
 * @returns Current playback state or null if nothing is playing
 * @throws Error if API request fails after exhausting retry attempts
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
 * Retrieves user's recently played tracks
 *
 * @param clientId - Spotify application client ID
 * @param clientSecret - Spotify application client secret
 * @param limit - Maximum number of history items to return
 * @returns Recently played tracks with metadata and timestamps
 * @throws Error if API request fails after exhausting retry attempts
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
 * Checks if a track exists in user's library
 *
 * @param clientId - Spotify application client ID
 * @param clientSecret - Spotify application client secret
 * @param trackId - Spotify track ID to check
 * @returns Library membership status of the track
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
 * Removes a track from user's library
 *
 * @param clientId - Spotify application client ID
 * @param clientSecret - Spotify application client secret
 * @param trackId - Spotify track ID to remove
 * @returns Operation success status
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
 * Ensures valid access token before making API requests
 * Automatically refreshes expired tokens when possible
 *
 * @param clientId - Spotify application client ID
 * @param clientSecret - Spotify application client secret
 * @throws Error if token refresh fails or no valid token is available
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
 * Retrieves current token state information
 *
 * @returns Object containing current token state and expiration
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
