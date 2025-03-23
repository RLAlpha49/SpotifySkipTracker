/**
 * Playback state management module
 *
 * Provides centralized state management for the playback monitor,
 * including state initialization, updates, and retrieval.
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
 */
export function resetPlaybackState(): void {
  playbackState = { ...initialState };
}

/**
 * Gets the current playback state
 *
 * @returns Current playback state
 */
export function getPlaybackState(): PlaybackState {
  return playbackState;
}

/**
 * Updates the current playback state
 *
 * @param updates Partial state updates to apply
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
 * @param id Spotify Client ID
 * @param secret Spotify Client Secret
 */
export function setCredentials(id: string, secret: string): void {
  clientId = id;
  clientSecret = secret;
}

/**
 * Gets the Spotify API credentials
 *
 * @returns Object containing clientId and clientSecret
 */
export function getCredentials(): { clientId: string; clientSecret: string } {
  return { clientId, clientSecret };
}

/**
 * Tracks when a track was last logged to prevent duplicate logs
 *
 * @param trackId Spotify track ID
 * @param timestamp Timestamp when the track was logged
 */
export function setTrackLastLogged(trackId: string, timestamp: number): void {
  trackLastLogged[trackId] = timestamp;
}

/**
 * Gets when a track was last logged
 *
 * @param trackId Spotify track ID
 * @returns Timestamp when the track was last logged, or 0 if never logged
 */
export function getTrackLastLogged(trackId: string): number {
  return trackLastLogged[trackId] || 0;
}

/**
 * Updates the recent tracks list
 *
 * @param recentTracks Array of track IDs
 */
export function setRecentTracks(recentTracks: string[]): void {
  playbackState.recentTracks = recentTracks;
}
