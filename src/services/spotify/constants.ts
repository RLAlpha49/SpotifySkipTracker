/**
 * @packageDocumentation
 * @module spotify/constants
 * @description Spotify API Constants
 *
 * This module contains all the constant values used throughout the Spotify API integration.
 * It centralizes critical configuration values such as endpoints, retry settings, and
 * required OAuth scopes for consistent use across the application.
 *
 * Key Constants:
 * - API endpoints (auth, token, base API URL)
 * - Retry configuration for API resilience
 * - Authentication scopes required for the application's functionality
 *
 * @module SpotifyConstants
 * @source
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
