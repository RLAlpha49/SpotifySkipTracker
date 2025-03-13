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
 */

import { exposeThemeContext } from "./theme/theme-context";
import { exposeWindowContext } from "./window/window-context";
import { contextBridge, ipcRenderer } from "electron";
import { LogLevel } from "@/types/logging";

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
   * Spotify API Bridge
   *
   * Provides controlled access to Spotify-related functionality in the renderer.
   * Each method invokes a corresponding handler in the main process via IPC.
   */
  contextBridge.exposeInMainWorld("spotify", {
    // Authentication methods
    authenticate: (
      credentials?: SpotifyCredentials,
      forceAuth: boolean = false,
    ) => ipcRenderer.invoke("spotify:authenticate", credentials, forceAuth),
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

    // Logging system
    saveLog: async (message: string, level?: LogLevel) => {
      return await ipcRenderer.invoke("spotify:saveLog", message, level);
    },
    getLogs: (count?: number) => ipcRenderer.invoke("spotify:getLogs", count),
    clearLogs: () => ipcRenderer.invoke("spotify:clearLogs"),
    openLogsDirectory: () => ipcRenderer.invoke("spotify:openLogsDirectory"),
    openSkipsDirectory: () => ipcRenderer.invoke("spotify:openSkipsDirectory"),

    // Application lifecycle
    restartApp: () => ipcRenderer.invoke("spotify:restartApp"),

    // Playback monitoring service
    startMonitoring: () => ipcRenderer.invoke("spotify:startMonitoring"),
    stopMonitoring: () => ipcRenderer.invoke("spotify:stopMonitoring"),
    isMonitoringActive: () => ipcRenderer.invoke("spotify:isMonitoringActive"),

    // Playback controls
    pausePlayback: () => ipcRenderer.invoke("spotify:pausePlayback"),
    resumePlayback: () => ipcRenderer.invoke("spotify:resumePlayback"),
    skipToPreviousTrack: () =>
      ipcRenderer.invoke("spotify:skipToPreviousTrack"),
    skipToNextTrack: () => ipcRenderer.invoke("spotify:skipToNextTrack"),

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
  });
}
