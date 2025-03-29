/**
 * @packageDocumentation
 * @module playback/state
 * @description Playback State Management Module
 *
 * Provides centralized state management for the playback monitoring system,
 * maintaining a consistent, reliable source of truth for all playback-related data.
 *
 * Features:
 * - Comprehensive playback state object with extensive metadata
 * - In-memory state management with controlled access patterns
 * - Track history tracking for advanced playback analysis
 * - Clean state initialization and reset capabilities
 * - Credential management for Spotify API authentication
 * - Recent track access prevention mechanisms
 * - Playback timing and progress tracking
 * - Pause duration monitoring for accurate listening metrics
 *
 * This module acts as the central data store for the playback monitoring system,
 * maintaining the current playback state and providing controlled access
 * through a set of specialized getter and setter functions. It ensures
 * consistent, predictable state transitions and prevents direct mutation
 * of internal state data.
 *
 * The state includes both user-facing playback information (track details,
 * artist information, etc.) and internal tracking data (timestamps, history,
 * etc.) necessary for accurate skip detection and listening analytics.
 */

import { PlaybackState } from "@/types/playback";

// Default playback state
const initialState: PlaybackState = {
  isPlaying: false,
  currentTrackId: null,
  currentTrackName: null,
  currentArtistName: null,
  currentAlbumName: null,
  currentAlbumArt: null,
  currentDeviceName: null,
  currentDeviceType: null,
  currentDeviceVolume: null,
  currentTrackDuration: null,
  currentTrackProgress: null,
  currentTrackProgressPercent: null,
  lastUpdated: null,
  // Additional properties for internal tracking
  recentTracks: [],
  libraryStatusLogged: false,
  totalPauseDuration: 0,
  pauseStartTime: undefined,
  lastSyncTime: null,
  isInLibrary: false,
  lastProgress: 0,
  lastTrackChangeTimestamp: null,
};

// Current playback state
let playbackState: PlaybackState = { ...initialState };

// Track which tracks have been logged recently
const trackLastLogged: Record<string, number> = {};

// Credentials
let clientId: string = "";
let clientSecret: string = "";

/**
 * Resets the playback state to its initial values
 *
 * Completely resets all playback state data to default values,
 * clearing all track information, device details, and internal
 * tracking data. This is typically called when stopping monitoring
 * or when a complete state reset is needed.
 *
 * @example
 * // Reset state when stopping monitoring
 * stopPlaybackMonitoring();
 * resetPlaybackState();
 * @source
 */
export function resetPlaybackState(): void {
  playbackState = { ...initialState };
}

/**
 * Gets the current playback state
 *
 * Retrieves the complete current playback state object containing
 * all track information, playback details, and internal tracking data.
 * This returns a direct reference to the state for performance reasons,
 * so consumers should not modify the returned object.
 *
 * @returns Current playback state with all properties
 *
 * @example
 * // Get current track information
 * const state = getPlaybackState();
 * if (state.isPlaying) {
 *   console.log(`Now playing: ${state.currentTrackName} by ${state.currentArtistName}`);
 * }
 * @source
 */
export function getPlaybackState(): PlaybackState {
  return playbackState;
}

/**
 * Updates the current playback state
 *
 * Applies partial updates to the playback state, merging the provided
 * changes with the existing state. This is the primary method for
 * modifying the playback state and ensures that only the specified
 * properties are updated while preserving other state values.
 *
 * @param updates Partial state object containing only the properties to update
 *
 * @example
 * // Update progress information
 * updatePlaybackState({
 *   currentTrackProgress: 45000,
 *   currentTrackProgressPercent: 0.25,
 *   lastUpdated: Date.now()
 * });
 *
 * @example
 * // Update track information
 * updatePlaybackState({
 *   currentTrackId: '1234567890',
 *   currentTrackName: 'Song Title',
 *   currentArtistName: 'Artist Name',
 *   currentAlbumName: 'Album Name',
 *   isPlaying: true
 * });
 * @source
 */
export function updatePlaybackState(updates: Partial<PlaybackState>): void {
  playbackState = {
    ...playbackState,
    ...updates,
  };
}

/**
 * Sets Spotify API credentials
 *
 * Stores the Spotify client ID and secret for use in API calls.
 * These credentials are required for authenticating API requests
 * to the Spotify Web API.
 *
 * @param id Spotify Client ID from the Spotify Developer Dashboard
 * @param secret Spotify Client Secret from the Spotify Developer Dashboard
 *
 * @example
 * // Set credentials during monitoring initialization
 * setCredentials('your-client-id', 'your-client-secret');
 * @source
 */
export function setCredentials(id: string, secret: string): void {
  clientId = id;
  clientSecret = secret;
}

/**
 * Gets the Spotify API credentials
 *
 * Retrieves the currently stored Spotify client ID and secret
 * as an object. Used by API modules that need to authenticate
 * requests to the Spotify Web API.
 *
 * @returns Object containing clientId and clientSecret properties
 *
 * @example
 * // Get credentials for API requests
 * const { clientId, clientSecret } = getCredentials();
 * if (!clientId || !clientSecret) {
 *   console.error('Missing Spotify API credentials');
 * }
 * @source
 */
export function getCredentials(): { clientId: string; clientSecret: string } {
  return { clientId, clientSecret };
}

/**
 * Tracks when a track was last logged to prevent duplicate logs
 *
 * Records the timestamp when a specific track was last logged or
 * processed, which helps prevent duplicate logging or processing
 * of the same track within a short time period.
 *
 * @param trackId Spotify track ID to record
 * @param timestamp Millisecond timestamp when the track was logged
 *
 * @example
 * // Record that we've just logged a track
 * setTrackLastLogged('spotify:track:1234567890', Date.now());
 * @source
 */
export function setTrackLastLogged(trackId: string, timestamp: number): void {
  trackLastLogged[trackId] = timestamp;
}

/**
 * Gets when a track was last logged
 *
 * Retrieves the timestamp when a specific track was last logged
 * or processed. Returns 0 if the track has never been logged.
 *
 * @param trackId Spotify track ID to check
 * @returns Millisecond timestamp when the track was last logged, or 0 if never logged
 *
 * @example
 * // Check if we've recently logged a track
 * const lastLogged = getTrackLastLogged('spotify:track:1234567890');
 * const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
 *
 * if (lastLogged > fiveMinutesAgo) {
 *   console.log('Track was logged less than 5 minutes ago');
 * }
 * @source
 */
export function getTrackLastLogged(trackId: string): number {
  return trackLastLogged[trackId] || 0;
}

/**
 * Updates the recent tracks list
 *
 * Sets the list of recently played track IDs in the playback state.
 * This is used for features like backward navigation detection and
 * listening pattern analysis.
 *
 * @param recentTracks Array of Spotify track IDs in order of recency
 *
 * @example
 * // Update the recent tracks list after fetching from Spotify API
 * const recentTracks = await spotifyApi.getRecentlyPlayedTracks();
 * const trackIds = recentTracks.items.map(item => item.track.id);
 * setRecentTracks(trackIds);
 * @source
 */
export function setRecentTracks(recentTracks: string[]): void {
  playbackState.recentTracks = recentTracks;
}
