/**
 * Spotify API Type Definitions
 *
 * Contains type definitions for Spotify API responses and requests.
 * These types map to the Spotify Web API's object structures.
 */

/**
 * Image object returned by Spotify API
 */
export interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

/**
 * External URLs object returned by Spotify API
 */
export interface SpotifyExternalUrls {
  spotify: string;
}

/**
 * Followers object returned by Spotify API
 */
export interface SpotifyFollowers {
  href: string | null;
  total: number;
}

/**
 * User profile object returned by Spotify API
 */
export interface SpotifyUserProfile {
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
 * Artist object returned by Spotify API
 */
export interface SpotifyArtist {
  external_urls: SpotifyExternalUrls;
  href: string;
  id: string;
  name: string;
  type: string;
  uri: string;
}

/**
 * Album object returned by Spotify API
 */
export interface SpotifyAlbum {
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
 * Track object returned by Spotify API
 */
export interface SpotifyTrack {
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
 * Device object returned by Spotify API
 */
export interface SpotifyDevice {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
}

/**
 * Playback state object returned by Spotify API
 */
export interface SpotifyPlaybackState {
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
 * Play history item returned by Spotify API
 */
export interface SpotifyPlayHistory {
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
 * Recently played tracks response from Spotify API
 */
export interface SpotifyRecentlyPlayedResponse {
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
 * Authentication tokens returned from Spotify API
 */
export interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/**
 * Token refresh response from Spotify API
 */
export interface SpotifyTokenRefreshResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
}

/**
 * Error response from HTTP request
 */
export interface AxiosErrorResponse {
  response?: {
    status: number;
    data?: unknown;
  };
  message?: string;
}
