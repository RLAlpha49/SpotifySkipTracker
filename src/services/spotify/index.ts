/**
 * @packageDocumentation
 * @module spotify
 * @description Spotify API Service
 *
 * A unified interface to all Spotify API functionality. This module serves as the main entry point
 * for interacting with the Spotify Web API throughout the application.
 *
 * Features:
 * - API constants and configuration management
 * - Credentials management (client ID and secret)
 * - Access and refresh token management
 * - OAuth 2.0 authentication flows
 * - User profile information retrieval
 * - Playback control and monitoring
 * - Library management (saved tracks, etc.)
 *
 * Usage:
 * ```typescript
 * import { getCurrentPlayback, likeTrack, getAuthorizationUrl } from '@/services/spotify';
 *
 * // Use any exported function to interact with Spotify API
 * const playbackState = await getCurrentPlayback();
 * ```
 *
 * @module SpotifyService
 * @source
 */

// Export constants
export * from "./constants";

// Export credentials management
export {
  ensureCredentialsSet,
  getCredentials,
  hasCredentials,
  setCredentials,
} from "./credentials";

// Export token management
export {
  clearTokens,
  ensureValidToken,
  getAccessToken,
  getRefreshToken,
  getTokenInfo,
  isTokenValid,
  refreshAccessToken,
  setTokens,
} from "./token";

// Export authentication
export { exchangeCodeForTokens, getAuthorizationUrl } from "./auth";

// Export user profile
export { getCurrentUser } from "./user";

// Export playback controls
export {
  getCurrentPlayback,
  getRecentlyPlayedTracks,
  getTrack,
  pause,
  play,
  skipToNext,
  skipToPrevious,
} from "./playback";

// Export library management
export { isTrackInLibrary, likeTrack, unlikeTrack } from "./library";
