/**
 * Global Type Definitions
 *
 * Centralized type declarations for cross-module interfaces,
 * window extensions for IPC communication, and Spotify API structures.
 */

import { StatisticsData } from "./types/statistics";
import { StatisticsAPI } from "./types/statistics-api";

// Vite-generated environment constants for Electron integration
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

/**
 * Theme management interface
 * Provides methods for controlling UI appearance modes
 */
interface ThemeModeContext {
  toggle: () => Promise<boolean>;
  dark: () => Promise<void>;
  light: () => Promise<void>;
  system: () => Promise<boolean>;
  current: () => Promise<"dark" | "light" | "system">;
}

/**
 * Electron window controls interface
 * Encapsulates window management operations
 */
interface ElectronWindow {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
}

/**
 * Spotify authentication credentials
 */
interface SpotifyCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Current playback state information
 * Contains track metadata and playback progress details
 */
interface SpotifyPlaybackInfo {
  isPlaying: boolean;
  trackId: string;
  trackName: string;
  artistName: string;
  albumName: string;
  albumArt: string;
  progress: number;
  duration: number;
  currentTimeSeconds?: number;
  currentTimeMs?: number;
  isInPlaylist?: boolean;
  monitoringStopped?: boolean;
}

/**
 * Information about tracks that have been skipped
 * Includes counts and metrics for skip analysis
 */
interface SkippedTrack {
  id: string;
  name: string;
  artist: string;
  skipCount: number;
  notSkippedCount: number;
  lastSkipped: string; // ISO date string
  skipHistory: string[]; // Array of ISO date strings for each skip event
}

/**
 * Application settings for Spotify integration and behavior
 */
interface SpotifySettings {
  autoUnlike: boolean;
  autoStartMonitoring: boolean;
  clientId: string;
  clientSecret: string;
  displayLogLevel: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  fileLogLevel: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  logAutoRefresh: boolean;
  logLevel: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  logLineCount: number;
  logRetentionDays: number;
  maxLogFiles: number;
  redirectUri: string;
  skipProgress: number;
  skipThreshold: number;
  timeframeInDays: number;
}

/**
 * Window interface extension
 * Augments the standard Window interface with application-specific APIs
 */
declare interface Window {
  themeMode: ThemeModeContext;
  electronWindow: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };
  theme: {
    setTheme: (theme: string) => void;
    getTheme: () => string;
  };

  /**
   * Statistics API for accessing skip metrics and patterns
   */
  statisticsAPI: StatisticsAPI;

  /**
   * Spotify API bindings
   * IPC-bridged methods for interacting with Spotify services
   */
  spotify: {
    // Authentication
    authenticate: (
      credentials?: SpotifyCredentials,
      forceAuth?: boolean,
    ) => Promise<boolean>;
    logout: () => Promise<boolean>;
    isAuthenticated: () => Promise<boolean>;

    // Playback
    getCurrentPlayback: () => Promise<SpotifyPlaybackInfo | null>;

    // Skipped tracks
    openURL: (url: string) => Promise<boolean | void>;
    getSkippedTracks: () => Promise<SkippedTrack[]>;
    refreshSkippedTracks: () => Promise<SkippedTrack[]>;
    saveSkippedTracks: (tracks: SkippedTrack[]) => Promise<boolean>;
    updateSkippedTrack: (track: SkippedTrack) => Promise<boolean>;
    removeFromSkippedData: (trackId: string) => Promise<boolean>;

    // Track library management
    unlikeTrack: (trackId: string) => Promise<boolean>;

    // Settings
    saveSettings: (settings: SpotifySettings) => Promise<boolean>;
    getSettings: () => Promise<SpotifySettings>;

    // Statistics
    getStatistics: () => Promise<StatisticsData>;
    clearStatistics: () => Promise<boolean>;

    // Logs
    saveLog: (
      message: string,
      level?: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL",
    ) => Promise<boolean | void>;
    getLogs: (count?: number) => Promise<string[]>;
    getLogsFromFile: (selectedLogFile: string) => Promise<string[]>;
    getAvailableLogFiles: () => Promise<
      {
        name: string;
        mtime: number;
        displayName: string;
      }[]
    >;
    clearLogs: () => Promise<boolean>;
    openLogsDirectory: () => Promise<boolean>;
    openSkipsDirectory: () => Promise<boolean>;

    // App Control
    restartApp: () => Promise<boolean>;

    // Service
    startMonitoring: () => Promise<boolean>;
    stopMonitoring: () => Promise<boolean>;
    isMonitoringActive: () => Promise<boolean>;

    // Playback Controls
    pausePlayback: () => Promise<boolean>;
    resumePlayback: () => Promise<boolean>;
    skipToPreviousTrack: () => Promise<boolean>;
    skipToNextTrack: () => Promise<boolean>;

    // Events
    onPlaybackUpdate: (
      callback: (data: SpotifyPlaybackInfo) => void,
    ) => () => void;
  };
}
