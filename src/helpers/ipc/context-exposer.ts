/**
 * Context Exposer Module
 *
 * This module sets up the secure communication bridge between the main process
 * and the renderer process. It uses Electron's contextBridge to safely expose
 * specific functionality from the main process to the renderer process.
 *
 * The exposed APIs allow the React application to:
 * 1. Control the window (minimize, maximize, close)
 * 2. Manage the application theme (dark/light mode)
 * 3. Interact with the Spotify API
 * 4. Manage application settings and logs
 * 5. Control playback monitoring
 */

import { exposeThemeContext } from "./theme/theme-context";
import { exposeWindowContext } from "./window/window-context";
import { contextBridge } from "electron";
import { ipcRenderer } from "electron";

/**
 * Exposes all contexts to the renderer process
 * This function is called from the preload script
 */
export default function exposeContexts() {
  // Expose window management functionality (minimize, maximize, close)
  exposeWindowContext();

  // Expose theme management functionality (dark/light mode)
  exposeThemeContext();

  /**
   * Spotify API Bridge
   *
   * Exposes all Spotify-related functionality to the renderer process.
   * Each method invokes a corresponding handler in the main process
   * and returns the result as a Promise.
   */
  contextBridge.exposeInMainWorld("spotify", {
    // Authentication-related methods
    authenticate: (credentials?: SpotifyCredentials) =>
      ipcRenderer.invoke("spotify:authenticate", credentials),
    logout: () => ipcRenderer.invoke("spotify:logout"),
    isAuthenticated: () => ipcRenderer.invoke("spotify:isAuthenticated"),

    // Playback information and control
    getCurrentPlayback: () => ipcRenderer.invoke("spotify:getCurrentPlayback"),

    // Skipped tracks management
    getSkippedTracks: () => ipcRenderer.invoke("spotify:getSkippedTracks"),
    saveSkippedTracks: (tracks: SkippedTrack[]) =>
      ipcRenderer.invoke("spotify:saveSkippedTracks", tracks),
    updateSkippedTrack: (track: SkippedTrack) =>
      ipcRenderer.invoke("spotify:updateSkippedTrack", track),
    removeFromSkippedData: (trackId: string) =>
      ipcRenderer.invoke("spotify:removeFromSkippedData", trackId),

    // Track library management
    unlikeTrack: (trackId: string) =>
      ipcRenderer.invoke("spotify:unlikeTrack", trackId),

    // Application settings management
    saveSettings: (settings: SpotifySettings) =>
      ipcRenderer.invoke("spotify:saveSettings", settings),
    getSettings: () => ipcRenderer.invoke("spotify:getSettings"),

    // Application logging system
    saveLog: (
      message: string,
      level?: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL",
    ) => ipcRenderer.invoke("spotify:saveLog", message, level),
    getLogs: (count?: number) => ipcRenderer.invoke("spotify:getLogs", count),
    clearLogs: () => ipcRenderer.invoke("spotify:clearLogs"),
    openLogsDirectory: () => ipcRenderer.invoke("spotify:openLogsDirectory"),
    openSkipsDirectory: () => ipcRenderer.invoke("spotify:openSkipsDirectory"),

    // Application lifecycle control
    restartApp: () => ipcRenderer.invoke("spotify:restartApp"),

    // Playback monitoring service control
    startMonitoring: () => ipcRenderer.invoke("spotify:startMonitoring"),
    stopMonitoring: () => ipcRenderer.invoke("spotify:stopMonitoring"),
    isMonitoringActive: () => ipcRenderer.invoke("spotify:isMonitoringActive"),

    // Event subscriptions
    /**
     * Subscribe to playback updates from the main process
     * Returns a function to unsubscribe when component unmounts
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
