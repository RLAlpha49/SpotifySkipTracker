/**
 * Spotify-related types used throughout the application
 */

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
  displayLogLevel: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";
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
  fileLogLevel: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  logLineCount: number;
  maxLogFiles: number;
  logRetentionDays: number;
  skipThreshold: number;
  timeframeInDays: number;
  skipProgress: number;
  autoStartMonitoring: boolean;
  autoUnlike: boolean;

  // Home page settings
  displayLogLevel?: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  logAutoRefresh?: boolean;

  // Legacy format support
  logLevel?: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";
} 