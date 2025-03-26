/**
 * Spotify API Service
 *
 * Provides a unified interface to all Spotify API functionality.
 * This module re-exports the functionality from all Spotify API modules.
 */

// Export constants
export * from "./constants";

// Export credentials management
export {
  setCredentials,
  hasCredentials,
  getCredentials,
  ensureCredentialsSet,
} from "./credentials";

// Export token management
export {
  isTokenValid,
  setTokens,
  clearTokens,
  getTokenInfo,
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
  ensureValidToken,
} from "./token";

// Export authentication
export { getAuthorizationUrl, exchangeCodeForTokens } from "./auth";

// Export user profile
export { getCurrentUser } from "./user";

// Export playback controls
export {
  getCurrentPlayback,
  getRecentlyPlayedTracks,
  getTrack,
  pause,
  play,
  skipToPrevious,
  skipToNext,
} from "./playback";

// Export library management
export { isTrackInLibrary, likeTrack, unlikeTrack } from "./library";
