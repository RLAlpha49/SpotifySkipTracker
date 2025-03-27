/**
 * Context bridge configuration module
 *
 * Establishes secure communication channels between main and renderer processes.
 * Uses Electron's contextBridge API to safely expose main process functionality
 * to the renderer process with proper security boundaries.
 *
 * Exposes APIs for:
 * 1. Window management (minimize, maximize, close)
 * 2. Theme management (dark/light mode)
 * 3. Spotify API interaction
 * 4. Application settings and logs
 * 5. Playback monitoring controls
 * 6. Skip statistics services
 */

import {
  SpotifyCredentials,
  SpotifyPlaybackInfo,
  SpotifySettings,
} from "@/services/spotify.service";
import { LogLevel } from "@/types/logging";
import { PlaybackState } from "@/types/playback";
import { SkippedTrack } from "@/types/spotify";
import { StatisticsData } from "@/types/statistics";
import { StatisticsAPI } from "@/types/statistics-api";
import { contextBridge, ipcRenderer } from "electron";
import { exposeThemeContext } from "./theme/theme-context";
import { exposeWindowContext } from "./window/window-context";

// Local type definitions for IPC communication
type AuthStatus = "authenticated" | "unauthenticated" | "authenticating";
type LoginResult = { success: boolean; error?: string };
type Track = { id: string; name: string; artist: string; album: string };
type LoginConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

/**
 * Window API interface - available in renderer process
 */
export interface SpotifyAPI {
  // File operations
  getLoginStored: () => Promise<{ username: string; password: string } | null>;
  storeLogin: (username: string, password: string) => Promise<void>;
  clearLogin: () => Promise<void>;
  saveSkippedTracks: (tracks: SkippedTrack[]) => Promise<void>;
  getAllSkippedTracks: () => Promise<SkippedTrack[]>;
  getLoginConfig: () => Promise<LoginConfig | null>;
  saveLoginConfig: (config: LoginConfig) => Promise<void>;
  saveLog: (message: string, level: LogLevel) => Promise<void>;

  // Statistics methods
  getStatistics: () => Promise<StatisticsData>;
  clearStatistics: () => Promise<boolean>;

  // App control
  exitApp: () => Promise<void>;
  minimizeApp: () => Promise<void>;
  maximizeApp: () => Promise<void>;
  openURL: (url: string) => Promise<void>;
  showItemInFolder: (path: string) => Promise<void>;

  // Spotify player control
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;

  // Authentication and player state
  authenticate: (
    credentials?: SpotifyCredentials,
    forceAuth?: boolean,
  ) => Promise<boolean>;
  isAuthenticated: () => Promise<boolean>;
  getCurrentPlayback: () => Promise<SpotifyPlaybackInfo | null>;

  // Skipped tracks management
  getSkippedTracks: () => Promise<SkippedTrack[]>;
  refreshSkippedTracks: () => Promise<SkippedTrack[]>;
  updateSkippedTrack: (track: SkippedTrack) => Promise<boolean>;
  removeFromSkippedData: (trackId: string) => Promise<boolean>;

  // Library management
  unlikeTrack: (trackId: string) => Promise<boolean>;

  // Settings management
  saveSettings: (settings: SpotifySettings) => Promise<boolean>;
  getSettings: () => Promise<SpotifySettings>;
  resetSettings: () => Promise<boolean>;

  // Logging system
  getLogs: (count?: number) => Promise<string[]>;
  clearLogs: () => Promise<boolean>;
  openLogsDirectory: () => Promise<boolean>;
  openSkipsDirectory: () => Promise<boolean>;
  getAvailableLogFiles: () => Promise<
    { name: string; mtime: number; displayName: string }[]
  >;
  getLogsFromFile: (fileName: string, count?: number) => Promise<string[]>;

  // Application lifecycle
  restartApp: () => Promise<boolean>;

  // Playback monitoring service
  startMonitoring: () => Promise<boolean>;
  stopMonitoring: () => Promise<boolean>;
  isMonitoringActive: () => Promise<boolean>;
  getMonitoringStatus: () => Promise<{
    active: boolean;
    status: string;
    message?: string;
    details?: string;
  }>;

  // Playback controls
  pausePlayback: () => Promise<boolean>;
  resumePlayback: () => Promise<boolean>;
  skipToPreviousTrack: () => Promise<boolean>;
  skipToNextTrack: () => Promise<boolean>;

  // Event callbacks
  onPlaybackUpdate: (
    callback: (data: SpotifyPlaybackInfo) => void,
  ) => () => void;
  onAuthStatusChange: (callback: (status: AuthStatus) => void) => void;
  onPlaybackStatusChange: (callback: (status: PlaybackState) => void) => void;
  onPlaybackTrackChange: (callback: (track: Track | null) => void) => void;
  onTrackSkipped: (callback: (skippedTrack: SkippedTrack) => void) => void;
  onMonitoringStatusChange: (
    callback: (status: {
      status: string;
      message?: string;
      details?: string;
    }) => void,
  ) => () => void;
}

/**
 * Exposes all API contexts to the renderer process
 * Called from the preload script during application initialization
 */
export default function exposeContexts(): void {
  // Window management API (minimize, maximize, close)
  exposeWindowContext();

  // Theme management API (dark/light mode)
  exposeThemeContext();

  /**
   * Statistics API Bridge
   *
   * Provides controlled access to statistics functionality in the renderer.
   * Each method invokes a corresponding handler in the main process via IPC.
   */
  contextBridge.exposeInMainWorld("statisticsAPI", {
    isCollectionActive: () =>
      ipcRenderer.invoke("statistics:isCollectionActive"),
    startCollection: () => ipcRenderer.invoke("statistics:startCollection"),
    stopCollection: () => ipcRenderer.invoke("statistics:stopCollection"),
    triggerAggregation: () =>
      ipcRenderer.invoke("statistics:triggerAggregation"),
    getDailySkipMetrics: () =>
      ipcRenderer.invoke("statistics:getDailySkipMetrics"),
    getWeeklySkipMetrics: () =>
      ipcRenderer.invoke("statistics:getWeeklySkipMetrics"),
    getSkipPatterns: () => ipcRenderer.invoke("statistics:getSkipPatterns"),
    detectPatterns: () => ipcRenderer.invoke("statistics:detectPatterns"),

    // Add artist insights
    getArtistInsights: () => ipcRenderer.invoke("statistics:getArtistInsights"),

    // Add statistics data methods
    getAll: () => ipcRenderer.invoke("statistics:getAll"),
    getUniqueArtistCount: () =>
      ipcRenderer.invoke("statistics:getUniqueArtistCount"),
    getSkippedTracks: () => ipcRenderer.invoke("statistics:getSkippedTracks"),
    getDailyMetrics: () => ipcRenderer.invoke("statistics:getDailyMetrics"),
    getArtistMetrics: () => ipcRenderer.invoke("statistics:getArtistMetrics"),
    getLibraryStats: () => ipcRenderer.invoke("statistics:getLibraryStats"),
    getTimePatterns: () => ipcRenderer.invoke("statistics:getTimePatterns"),

    // Add export functions
    exportSkippedTracksToCSV: () =>
      ipcRenderer.invoke("statistics:exportSkippedTracksToCSV"),
    exportArtistMetricsToCSV: () =>
      ipcRenderer.invoke("statistics:exportArtistMetricsToCSV"),
    exportDailyMetricsToCSV: () =>
      ipcRenderer.invoke("statistics:exportDailyMetricsToCSV"),
    exportWeeklyMetricsToCSV: () =>
      ipcRenderer.invoke("statistics:exportWeeklyMetricsToCSV"),
    exportLibraryStatisticsToCSV: () =>
      ipcRenderer.invoke("statistics:exportLibraryStatisticsToCSV"),
    exportTimePatternsToCSV: () =>
      ipcRenderer.invoke("statistics:exportTimePatternsToCSV"),
    exportDetectedPatternsToCSV: () =>
      ipcRenderer.invoke("statistics:exportDetectedPatternsToCSV"),
    exportAllToJSON: () => ipcRenderer.invoke("statistics:exportAllToJSON"),
    copyToClipboard: () => ipcRenderer.invoke("statistics:copyToClipboard"),

    // Need to add getArtistSkipMetrics for interface compatibility
    getArtistSkipMetrics: () =>
      ipcRenderer.invoke("statistics:getArtistSkipMetrics"),
  });

  /**
   * Spotify API Bridge
   *
   * Provides controlled access to Spotify-related functionality in the renderer.
   * Each method invokes a corresponding handler in the main process via IPC.
   */
  contextBridge.exposeInMainWorld("spotify", {
    // File operations
    getLoginStored: () => ipcRenderer.invoke("spotify:getLoginStored"),
    storeLogin: (username: string, password: string) =>
      ipcRenderer.invoke("spotify:storeLogin", username, password),
    clearLogin: () => ipcRenderer.invoke("spotify:clearLogin"),
    getAllSkippedTracks: () => ipcRenderer.invoke("spotify:getSkippedTracks"),

    // Spotify API methods
    authenticate: (
      credentials?: SpotifyCredentials,
      forceAuth: boolean = false,
    ) => ipcRenderer.invoke("spotify:authenticate", credentials, forceAuth),
    login: (username: string, password: string) =>
      ipcRenderer.invoke("spotify:authenticate", { username, password }),
    logout: () => ipcRenderer.invoke("spotify:logout"),
    isAuthenticated: () => ipcRenderer.invoke("spotify:isAuthenticated"),

    // Playback information methods
    getCurrentPlayback: () => ipcRenderer.invoke("spotify:getCurrentPlayback"),

    // Skipped tracks management
    getSkippedTracks: () => ipcRenderer.invoke("spotify:getSkippedTracks"),
    refreshSkippedTracks: () =>
      ipcRenderer.invoke("spotify:refreshSkippedTracks"),
    saveSkippedTracks: (tracks: SkippedTrack[]) =>
      ipcRenderer.invoke("spotify:saveSkippedTracks", tracks),
    updateSkippedTrack: (track: SkippedTrack) =>
      ipcRenderer.invoke("spotify:updateSkippedTrack", track),
    removeFromSkippedData: (trackId: string) =>
      ipcRenderer.invoke("spotify:removeFromSkippedData", trackId),

    // Library management
    unlikeTrack: (trackId: string) =>
      ipcRenderer.invoke("spotify:unlikeTrack", trackId),

    // Settings management
    saveSettings: (settings: SpotifySettings) =>
      ipcRenderer.invoke("spotify:saveSettings", settings),
    getSettings: () => ipcRenderer.invoke("spotify:getSettings"),
    resetSettings: () => ipcRenderer.invoke("spotify:resetSettings"),
    getLoginConfig: () => ipcRenderer.invoke("spotify:getSettings"),
    saveLoginConfig: (config: LoginConfig) =>
      ipcRenderer.invoke("spotify:saveSettings", config),

    // Statistics methods
    getStatistics: () => ipcRenderer.invoke("spotify:getStatistics"),
    clearStatistics: () => ipcRenderer.invoke("spotify:clearStatistics"),

    // App control
    exitApp: () => ipcRenderer.invoke("window:close"),
    minimizeApp: () => ipcRenderer.invoke("window:minimize"),
    maximizeApp: () => ipcRenderer.invoke("window:maximize"),
    openURL: (url: string) => ipcRenderer.invoke("spotify:openURL", url),
    showItemInFolder: (path: string) =>
      ipcRenderer.invoke("spotify:showItemInFolder", path),

    // Logging system
    saveLog: async (message: string, level: LogLevel = "INFO") => {
      return await ipcRenderer.invoke("spotify:saveLog", message, level);
    },
    getLogs: (count?: number) => ipcRenderer.invoke("spotify:getLogs", count),
    clearLogs: () => ipcRenderer.invoke("spotify:clearLogs"),
    openLogsDirectory: () => ipcRenderer.invoke("spotify:openLogsDirectory"),
    openSkipsDirectory: () => ipcRenderer.invoke("spotify:openSkipsDirectory"),
    getAvailableLogFiles: () =>
      ipcRenderer.invoke("spotify:getAvailableLogFiles"),
    getLogsFromFile: (fileName: string, count?: number) =>
      ipcRenderer.invoke("spotify:getLogsFromFile", fileName, count),

    // Application lifecycle
    restartApp: () => ipcRenderer.invoke("spotify:restartApp"),

    // Playback monitoring service
    startMonitoring: () => ipcRenderer.invoke("spotify:startMonitoring"),
    stopMonitoring: () => ipcRenderer.invoke("spotify:stopMonitoring"),
    isMonitoringActive: () => ipcRenderer.invoke("spotify:isMonitoringActive"),
    getMonitoringStatus: () =>
      ipcRenderer.invoke("spotify:getMonitoringStatus"),

    // Playback controls
    pausePlayback: () => ipcRenderer.invoke("spotify:pausePlayback"),
    resumePlayback: () => ipcRenderer.invoke("spotify:resumePlayback"),
    play: () => ipcRenderer.invoke("spotify:resumePlayback"),
    pause: () => ipcRenderer.invoke("spotify:pausePlayback"),
    next: () => ipcRenderer.invoke("spotify:skipToNextTrack"),
    previous: () => ipcRenderer.invoke("spotify:skipToPreviousTrack"),
    skipToPreviousTrack: () =>
      ipcRenderer.invoke("spotify:skipToPreviousTrack"),
    skipToNextTrack: () => ipcRenderer.invoke("spotify:skipToNextTrack"),

    // Event listeners
    onAuthStatusChange: (callback: (status: AuthStatus) => void) =>
      ipcRenderer.on("spotify:auth-status-changed", (_, status) =>
        callback(status),
      ),
    onPlaybackStatusChange: (callback: (status: PlaybackState) => void) =>
      ipcRenderer.on("spotify:playback-status-changed", (_, status) =>
        callback(status),
      ),
    onPlaybackTrackChange: (callback: (track: Track | null) => void) =>
      ipcRenderer.on("spotify:track-changed", (_, track) => callback(track)),
    onTrackSkipped: (callback: (skippedTrack: SkippedTrack) => void) =>
      ipcRenderer.on("spotify:track-skipped", (_, trackData) =>
        callback(trackData),
      ),
    onMonitoringStatusChange: (
      callback: (status: {
        status: string;
        message?: string;
        details?: string;
      }) => void,
    ) => {
      const subscription = (
        _event: Electron.IpcRendererEvent,
        status: { status: string; message?: string; details?: string },
      ) => callback(status);

      ipcRenderer.on("spotify:monitoring-status", subscription);

      // Return unsubscribe function for cleanup
      return () => {
        ipcRenderer.removeListener("spotify:monitoring-status", subscription);
      };
    },

    /**
     * Registers a callback for playback updates from the main process
     *
     * @param callback - Function to execute when playback data is received
     * @returns Function to unsubscribe when component unmounts
     */
    onPlaybackUpdate: (callback: (data: SpotifyPlaybackInfo) => void) => {
      const subscription = (
        _event: Electron.IpcRendererEvent,
        data: SpotifyPlaybackInfo,
      ) => callback(data);
      ipcRenderer.on("spotify:playbackUpdate", subscription);

      // Return unsubscribe function for cleanup
      return () => {
        ipcRenderer.removeListener("spotify:playbackUpdate", subscription);
      };
    },

    // Statistics methods
    isCollectionActive: () =>
      ipcRenderer.invoke("statistics:isCollectionActive"),
    startCollection: () => ipcRenderer.invoke("statistics:startCollection"),
    stopCollection: () => ipcRenderer.invoke("statistics:stopCollection"),
    triggerAggregation: () =>
      ipcRenderer.invoke("statistics:triggerAggregation"),
    getDailySkipMetrics: () =>
      ipcRenderer.invoke("statistics:getDailySkipMetrics"),
    getWeeklySkipMetrics: () =>
      ipcRenderer.invoke("statistics:getWeeklySkipMetrics"),
    getSkipPatterns: () => ipcRenderer.invoke("statistics:getSkipPatterns"),
    detectPatterns: () => ipcRenderer.invoke("statistics:detectPatterns"),
  } as SpotifyAPI & Partial<StatisticsAPI>);

  /**
   * File Access API Bridge
   *
   * Provides controlled access to file system operations in the renderer.
   * Each method invokes a corresponding handler in the main process via IPC.
   */
  contextBridge.exposeInMainWorld("fileAccess", {
    readFile: (path: string) => ipcRenderer.invoke("fileAccess:readFile", path),
    saveFile: (path: string, content: string) =>
      ipcRenderer.invoke("fileAccess:saveFile", path, content),
    showOpenDialog: (options: object) =>
      ipcRenderer.invoke("fileAccess:showOpenDialog", options),
    showSaveDialog: (options: object) =>
      ipcRenderer.invoke("fileAccess:showSaveDialog", options),
    getAppPath: () => ipcRenderer.invoke("fileAccess:getAppPath"),
    getPath: (name: string) => ipcRenderer.invoke("fileAccess:getPath", name),
    readDirectory: (path: string) =>
      ipcRenderer.invoke("fileAccess:readDirectory", path),
    exists: (path: string) => ipcRenderer.invoke("fileAccess:exists", path),
    mkdir: (path: string) => ipcRenderer.invoke("fileAccess:mkdir", path),
    unlink: (path: string) => ipcRenderer.invoke("fileAccess:unlink", path),
  });
}
