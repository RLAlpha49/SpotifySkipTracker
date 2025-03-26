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
  isPlaying: boolean;
  isInPlaylist?: boolean;
}

/**
 * Interface for log display settings
 */
export interface LogSettings {
  displayLogLevel: LogLevel;
  logAutoRefresh: boolean;
}

/**
 * Application settings type definition
 * Includes all application configuration parameters
 */
export interface SpotifySettings {
  // Spotify API credentials
  clientId: string;
  clientSecret: string;
  redirectUri: string;

  // App settings
  fileLogLevel: LogLevel;
  logLineCount: number;
  maxLogFiles: number;
  logRetentionDays: number;
  skipThreshold: number;
  timeframeInDays: number;
  skipProgress: number;
  autoStartMonitoring: boolean;
  autoUnlike: boolean;

  // Home page settings
  displayLogLevel?: LogLevel;
  logAutoRefresh?: boolean;

  // Legacy format support
  logLevel?: LogLevel;
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
  lastSkipped?: string;
  timeOfDay?: Record<string, number>;
  averagePlayPercentage?: number;
  skipHistory?: string[];
  skipTimestamps?: string[];
  notSkippedCount?: number;
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
