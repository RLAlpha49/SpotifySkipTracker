/**
 * Global Type Definitions
 *
 * Centralized type declarations for cross-module interfaces,
 * window extensions for IPC communication, and Spotify API structures.
 */

import { DetectedPattern } from "@/services/statistics/pattern-detector";
import { LogLevel } from "@/types/logging";
import { StatisticsData } from "./types/statistics";

/**
 * Response format for export operations
 */
export interface ExportResponse {
  success: boolean;
  message?: string;
  filePath?: string;
}

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
 * Dashboard summary statistics
 */
interface StatisticsSummary {
  totalTracks: number;
  totalSkips: number;
  skipPercentage: number;
  todaySkips: number;
  weekSkips: number;
  monthSkips: number;
  avgSkipTime: number;
}

/**
 * Dashboard track data
 */
interface DashboardTrackData {
  id: string;
  name: string;
  artist: string;
  album: string;
  timestamp: string;
  skipPercentage: number;
  skipCount: number;
}

/**
 * Dashboard artist data
 */
interface DashboardArtistData {
  id: string;
  name: string;
  skipCount: number;
  trackCount: number;
  skipPercentage: number;
}

/**
 * Dashboard session data
 */
interface DashboardSessionData {
  id: string;
  date: string;
  duration: number;
  trackCount: number;
  skipCount: number;
  skipPercentage: number;
}

/**
 * Centralized StatisticsAPI interface
 * Defines all methods available through the statisticsAPI global
 */
interface StatisticsAPI {
  // Collection service controls
  isCollectionActive: () => Promise<boolean>;
  startCollection: () => Promise<{ success: boolean; message?: string }>;
  stopCollection: () => Promise<{ success: boolean; message?: string }>;
  triggerAggregation: () => Promise<{ success: boolean; message?: string }>;

  // Statistics data access
  getDailySkipMetrics: () => Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }>;
  getWeeklySkipMetrics: () => Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }>;
  getArtistSkipMetrics: () => Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }>;
  getLibraryStats: () => Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }>;
  getTimePatterns: () => Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }>;
  getSkipPatterns: () => Promise<{
    success: boolean;
    data?: DetectedPattern[];
    error?: string;
  }>;
  detectPatterns: () => Promise<{ success: boolean; message?: string }>;

  // Artist insights
  getArtistInsights: () => Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }>;

  // Statistics data methods
  getAll: () => Promise<StatisticsData>;
  getUniqueArtistCount: () => Promise<number>;
  getSkippedTracks: () => Promise<SkippedTrack[]>;
  getDailyMetrics: () => Promise<Record<string, unknown>>;
  getArtistMetrics: () => Promise<Record<string, unknown>>;

  // Export functions
  exportSkippedTracksToCSV: () => Promise<ExportResponse>;
  exportArtistMetricsToCSV: () => Promise<ExportResponse>;
  exportDailyMetricsToCSV: () => Promise<ExportResponse>;
  exportWeeklyMetricsToCSV: () => Promise<ExportResponse>;
  exportLibraryStatisticsToCSV: () => Promise<ExportResponse>;
  exportTimePatternsToCSV: () => Promise<ExportResponse>;
  exportDetectedPatternsToCSV: () => Promise<ExportResponse>;
  exportAllToJSON: () => Promise<ExportResponse>;
  copyToClipboard: () => Promise<ExportResponse>;
}

declare global {
  interface Window {
    themeMode: ThemeModeContext;
    electronWindow: ElectronWindow;
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

      // Dashboard statistics
      getStatisticsSummary: () => Promise<StatisticsSummary>;
      getRecentSkippedTracks: (limit?: number) => Promise<DashboardTrackData[]>;
      getTopSkippedArtists: (limit?: number) => Promise<DashboardArtistData[]>;
      getRecentSessions: (limit?: number) => Promise<DashboardSessionData[]>;
      exportStatistics: () => Promise<boolean>;
      clearAllStatistics: () => Promise<boolean>;

      // Logs
      saveLog: (message: string, level?: LogLevel) => Promise<boolean | void>;
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
      getMonitoringStatus: () => Promise<{
        active: boolean;
        status: string;
        message?: string;
        details?: string;
      }>;

      // Playback Controls
      pausePlayback: () => Promise<boolean>;
      resumePlayback: () => Promise<boolean>;
      skipToPreviousTrack: () => Promise<boolean>;
      skipToNextTrack: () => Promise<boolean>;

      // Events
      onPlaybackUpdate: (
        callback: (data: SpotifyPlaybackInfo) => void,
      ) => () => void;
      onMonitoringStatusChange: (
        callback: (status: {
          status: string;
          message?: string;
          details?: string;
        }) => void,
      ) => () => void;
    };
  }
}

// This export is necessary for TypeScript to recognize this as a module
export {};
