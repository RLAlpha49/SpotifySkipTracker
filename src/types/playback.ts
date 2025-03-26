/**
 * Playback monitoring type definitions
 *
 * Contains types for playback state, track data, and Spotify API responses
 * used across the playback monitoring modules.
 */

import { BrowserWindow } from "electron";

/**
 * State information about current playback including track metadata and progress
 */
export interface PlaybackState {
  isPlaying: boolean;
  currentTrackId: string | null;
  currentTrackName: string | null;
  currentArtistName: string | null;
  currentAlbumName: string | null;
  currentAlbumArt: string | null;
  currentDeviceName: string | null;
  currentDeviceType: string | null;
  currentDeviceVolume: number | null;
  currentTrackDuration: number | null;
  currentTrackProgress: number | null;
  currentTrackProgressPercent: number | null;
  lastUpdated: number | null;
  // Additional properties for internal tracking
  recentTracks?: string[];
  libraryStatusLogged?: boolean;
  totalPauseDuration?: number;
  pauseStartTime?: number | undefined;
  lastSyncTime?: number | null;
  isInLibrary?: boolean;
  lastProgress?: number;
  lastTrackChangeTimestamp?: number | null;
  deviceId?: string | null;
  deviceName?: string | null;
}

/**
 * Data sent to the renderer process for playback updates
 */
export interface PlaybackUpdateData {
  isPlaying: boolean;
  trackId: string | null;
  trackName: string | null;
  artistName: string | null;
  albumName: string | null;
  albumArt: string | null;
  deviceName: string | null;
  deviceType: string | null;
  deviceVolume: number | null;
  trackDuration: number | null;
  trackProgress: number | null;
  trackProgressPercent: number | null;

  // For backward compatibility with frontend
  progress?: number;
  duration?: number;
  currentTimeSeconds?: number;
  currentTimeMs?: number;
  isInPlaylist?: boolean;
}

/**
 * Configuration for the playback monitor
 */
export interface MonitorConfig {
  mainWindow: BrowserWindow;
  spotifyClientId: string;
  spotifyClientSecret: string;
}

/**
 * Playback monitor configuration
 */
export interface PlaybackMonitorConfig {
  // Polling interval in milliseconds
  pollingInterval: number;

  // UI progress update interval
  progressUpdateInterval: number;

  // Maximum backoff interval when errors occur
  maxBackoffInterval: number;

  // Initial backoff delay when errors start occurring
  initialBackoffDelay: number;

  // Multiplier for exponential backoff
  backoffMultiplier: number;

  // Number of consecutive errors before backoff is applied
  errorThreshold: number;

  // Polling interval to use when in battery saving mode
  lowBatteryPollingInterval: number;

  // Skip detection threshold in percent (for backward compatibility)
  skipThreshold?: number;

  // Whether to automatically start monitoring on app launch (for backward compatibility)
  autoStart?: boolean;

  // Whether to log detailed playback information (for backward compatibility)
  verbose?: boolean;
}

/**
 * Playback monitor event handlers
 */
export interface PlaybackMonitorEvents {
  // Called when a track is skipped
  onTrackSkipped?: (
    trackId: string,
    trackName: string,
    artistName: string,
    progress: number,
  ) => void;

  // Called when playback state changes
  onPlaybackChanged?: (
    isPlaying: boolean,
    trackId: string | null,
    trackName: string | null,
  ) => void;

  // Called when a track completes normally
  onTrackCompleted?: (
    trackId: string,
    trackName: string,
    artistName: string,
  ) => void;
}

/**
 * Playback status enum
 */
export enum PlaybackStatus {
  PLAYING = "playing",
  PAUSED = "paused",
  STOPPED = "stopped",
  CHANGED = "changed",
  SKIPPED = "skipped",
  COMPLETED = "completed",
}
