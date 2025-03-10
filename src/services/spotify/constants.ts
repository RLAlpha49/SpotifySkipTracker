/**
 * Spotify API Constants
 *
 * Contains constant values used throughout the Spotify API integration.
 */

// API endpoints
export const AUTH_URL = "https://accounts.spotify.com/authorize";
export const TOKEN_URL = "https://accounts.spotify.com/api/token";
export const API_BASE_URL = "https://api.spotify.com/v1";

// Retry configuration
export const DEFAULT_RETRY_COUNT = 3;
export const DEFAULT_RETRY_DELAY = 1000; // 1 second

// Authentication scopes
export const SPOTIFY_SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-library-modify",
  "user-library-read",
  "user-read-recently-played",
];
