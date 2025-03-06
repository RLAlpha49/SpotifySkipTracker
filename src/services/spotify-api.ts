import axios from "axios";
import querystring from "querystring";
import { saveLog } from "../helpers/storage/store";

// Spotify API endpoints
const AUTH_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE_URL = "https://api.spotify.com/v1";

// Token storage
let accessToken: string | null = null;
let refreshToken: string | null = null;
let tokenExpiryTime: number = 0;

// Define types for Spotify API responses
interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

interface SpotifyExternalUrls {
  spotify: string;
}

interface SpotifyFollowers {
  href: string | null;
  total: number;
}

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

interface SpotifyArtist {
  external_urls: SpotifyExternalUrls;
  href: string;
  id: string;
  name: string;
  type: string;
  uri: string;
}

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

interface SpotifyDevice {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
}

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

    saveLog("Successfully exchanged authorization code for tokens", "INFO");

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
    saveLog(`Failed to refresh access token: ${error}`, "ERROR");
    throw error;
  }
}

/**
 * Check if the token is valid and not expired
 */
export function isTokenValid(): boolean {
  return !!accessToken && Date.now() < tokenExpiryTime;
}

/**
 * Set tokens directly (e.g., from stored values)
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
 */
export async function getCurrentUser(
  clientId: string,
  clientSecret: string,
): Promise<SpotifyUserProfile> {
  await ensureValidToken(clientId, clientSecret);

  try {
    const response = await axios.get(`${API_BASE_URL}/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    saveLog(`Failed to get current user: ${error}`, "ERROR");
    throw error;
  }
}

/**
 * Get the user's current playback state
 */
export async function getCurrentPlayback(
  clientId: string,
  clientSecret: string,
): Promise<SpotifyPlaybackState | null> {
  await ensureValidToken(clientId, clientSecret);

  try {
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
  } catch (error) {
    saveLog(`Failed to get current playback: ${error}`, "ERROR");
    throw error;
  }
}

/**
 * Get the user's recently played tracks
 */
export async function getRecentlyPlayedTracks(
  clientId: string,
  clientSecret: string,
  limit: number = 5,
): Promise<SpotifyRecentlyPlayedResponse> {
  await ensureValidToken(clientId, clientSecret);

  try {
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
  } catch (error) {
    saveLog(`Failed to get recently played tracks: ${error}`, "ERROR");
    throw error;
  }
}

/**
 * Check if a track is in the user's saved tracks (library)
 */
export async function isTrackInLibrary(
  clientId: string,
  clientSecret: string,
  trackId: string,
): Promise<boolean> {
  await ensureValidToken(clientId, clientSecret);

  try {
    const response = await axios.get(`${API_BASE_URL}/me/tracks/contains`, {
      params: { ids: trackId },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data[0] || false;
  } catch (error) {
    saveLog(`Failed to check if track is in library: ${error}`, "ERROR");
    return false;
  }
}

/**
 * Unlike (remove from library) a track
 */
export async function unlikeTrack(
  clientId: string,
  clientSecret: string,
  trackId: string,
): Promise<boolean> {
  await ensureValidToken(clientId, clientSecret);

  try {
    await axios.delete(`${API_BASE_URL}/me/tracks`, {
      params: { ids: trackId },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    saveLog(`Removed track ${trackId} from library`, "INFO");
    return true;
  } catch (error) {
    saveLog(`Failed to unlike track: ${error}`, "ERROR");
    return false;
  }
}

/**
 * Ensure the token is valid before making API calls
 */
async function ensureValidToken(
  clientId: string,
  clientSecret: string,
): Promise<void> {
  if (!isTokenValid()) {
    if (refreshToken) {
      await refreshAccessToken(clientId, clientSecret);
    } else {
      throw new Error("No valid token or refresh token available");
    }
  }
}

/**
 * Get current token information
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
