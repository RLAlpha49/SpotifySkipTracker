import { DetectedPattern } from "@/services/statistics/pattern-detector";
import { SkippedTrack } from "@/types/spotify";
import {
  SpotifyCredentials,
  SpotifyPlaybackInfo,
  SpotifySettings,
  ThemeModeContext,
} from "./types";
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
 * Centralized StatisticsAPI interface
 * Defines all methods available through the statisticsAPI global
 */
export interface StatisticsAPI {
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
}

// This export is necessary for TypeScript to recognize this as a module
export {};
