/**
 * Global Type Definitions
 *
 * Centralized type declarations for cross-module interfaces,
 * window extensions for IPC communication, and Spotify API structures.
 */

import { LogLevel } from "@/types/logging";
import { StatisticsData } from "./types/statistics";
import { DashboardSessionData, DashboardArtistData } from "./types/dashboard";
import { DashboardTrackData } from "./types/dashboard";
import { StatisticsSummary } from "./types/dashboard";
import { SettingsSchema } from "./types/settings";
import { PlaybackInfo, SkippedTrack } from "./types/spotify";
import { AuthConfig } from "./types/auth";
import { StatisticsAPI } from "./types/statistics-api";

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
        credentials?: AuthConfig,
        forceAuth?: boolean,
      ) => Promise<boolean>;
      logout: () => Promise<boolean>;
      isAuthenticated: () => Promise<boolean>;

      // Playback
      getCurrentPlayback: () => Promise<PlaybackInfo | null>;

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
      saveSettings: (settings: SettingsSchema) => Promise<boolean>;
      getSettings: () => Promise<SettingsSchema>;
      resetSettings: () => Promise<boolean>;
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
      onPlaybackUpdate: (callback: (data: PlaybackInfo) => void) => () => void;
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
