/**
 * Spotify-related types used throughout the application
 */

import { LogLevel } from "./logging";

/**
 * Interface representing Spotify playback state
 */
export interface PlaybackInfo {
  albumArt: string;
  trackName: string;
  artist: string;
  album: string;
  progress: number;
  duration: number;
  currentTimeSeconds?: number;
  currentTimeMs?: number;
  isPlaying: boolean;
  isInPlaylist?: boolean;
  monitoringStopped?: boolean;
  artistName?: string;
  albumName?: string;
}

/**
 * Interface for log display settings
 */
export interface LogSettings {
  displayLogLevel: LogLevel;
  logAutoRefresh: boolean;
}

/**
 * Track data with skip statistics and metadata
 */
export interface SkippedTrack {
  id: string;
  name: string;
  artist: string;
  albumName?: string;
  albumId?: string;
  duration?: number;
  skipCount?: number;
  skipTypes?: Record<string, number>;
  manualSkipCount?: number;
  autoSkipCount?: number;
  autoProcessed?: boolean;
  lastSkipped?: string;
  timeOfDay?: Record<string, number>;
  averagePlayPercentage?: number;
  skipHistory?: string[];
  skipTimestamps?: string[];
  notSkippedCount?: number;
  isInLibrary?: boolean;
  lastContext?: {
    type: string;
    uri?: string;
    name?: string;
    id?: string;
  };
  contextStats?: {
    total: number;
    contexts: Record<
      string,
      {
        type: string;
        name?: string;
        uri?: string;
        count: number;
      }
    >;
  };
  skipEvents?: Array<{
    timestamp: string;
    progress: number;
    isManualSkip?: boolean;
    skipType?: string;
    context?: {
      type: string;
      uri?: string;
      name?: string;
      id?: string;
    };
  }>;
}
