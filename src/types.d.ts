/**
 * Global Type Definitions for Spotify Skip Tracker
 *
 * This file contains type definitions used throughout the application,
 * including Electron-specific types, Spotify API interfaces, and
 * global window extensions for IPC communication.
 */

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Vite
// plugin that tells the Electron app where to look for the Vite-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// Preload types
/**
 * Interface for theme mode management functions exposed from the preload script
 * Provides methods to toggle, set, and query the UI theme (dark/light/system)
 */
interface ThemeModeContext {
  toggle: () => Promise<boolean>;
  dark: () => Promise<void>;
  light: () => Promise<void>;
  system: () => Promise<boolean>;
  current: () => Promise<"dark" | "light" | "system">;
}

/**
 * Interface for electron window control functions exposed from the preload script
 */
interface ElectronWindow {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
}

// Define Spotify-related types
/**
 * Authentication credentials for the Spotify API
 */
interface SpotifyCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Information about the currently playing track from Spotify
 * Used to display playback information and track progress
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
}

/**
 * Application settings for Spotify integration and behavior
 */
interface SpotifySettings {
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
 * Extension of the Window interface to add our custom API methods
 * These methods are exposed via the preload script using contextBridge
 */
declare interface Window {
  themeMode: ThemeModeContext;
  electronWindow: ElectronWindow;

  /**
   * Spotify API methods exposed to the renderer process
   * These methods communicate with the main process via IPC
   */
  spotify: {
    // Authentication
    authenticate: (credentials?: SpotifyCredentials) => Promise<boolean>;
    logout: () => Promise<boolean>;
    isAuthenticated: () => Promise<boolean>;

    // Playback
    getCurrentPlayback: () => Promise<SpotifyPlaybackInfo | null>;

    // Skipped tracks
    getSkippedTracks: () => Promise<SkippedTrack[]>;
    saveSkippedTracks: (tracks: SkippedTrack[]) => Promise<boolean>;
    updateSkippedTrack: (track: SkippedTrack) => Promise<boolean>;
    removeFromSkippedData: (trackId: string) => Promise<boolean>;

    // Track library management
    unlikeTrack: (trackId: string) => Promise<boolean>;

    // Settings
    saveSettings: (settings: SpotifySettings) => Promise<boolean>;
    getSettings: () => Promise<SpotifySettings>;

    // Logs
    saveLog: (
      message: string,
      level?: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL",
    ) => Promise<boolean>;
    getLogs: (count?: number) => Promise<string[]>;
    clearLogs: () => Promise<boolean>;
    openLogsDirectory: () => Promise<boolean>;
    openSkipsDirectory: () => Promise<boolean>;

    // App Control
    restartApp: () => Promise<boolean>;

    // Service
    startMonitoring: () => Promise<boolean>;
    stopMonitoring: () => Promise<boolean>;
    isMonitoringActive: () => Promise<boolean>;

    // Events
    onPlaybackUpdate: (
      callback: (data: SpotifyPlaybackInfo) => void,
    ) => () => void;
  };
}
