import { StatisticsData } from "./types/statistics";
import {
  ThemeModeContext,
  ElectronWindow,
  SpotifyCredentials,
  SpotifyPlaybackInfo,
  SkippedTrack,
  SpotifySettings,
} from "./types";

declare global {
  interface Window {
    themeMode: ThemeModeContext;
    electronWindow: ElectronWindow;

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
      openURL: (url: string) => Promise<boolean>;
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
      ) => Promise<boolean>;
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
