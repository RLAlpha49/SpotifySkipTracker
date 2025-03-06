import { exposeThemeContext } from "./theme/theme-context";
import { exposeWindowContext } from "./window/window-context";
import { contextBridge } from "electron";
import { ipcRenderer } from "electron";

export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();

  // Expose Spotify API
  contextBridge.exposeInMainWorld("spotify", {
    // Authentication
    authenticate: (credentials?: SpotifyCredentials) =>
      ipcRenderer.invoke("spotify:authenticate", credentials),
    logout: () => ipcRenderer.invoke("spotify:logout"),
    isAuthenticated: () => ipcRenderer.invoke("spotify:isAuthenticated"),

    // Playback
    getCurrentPlayback: () => ipcRenderer.invoke("spotify:getCurrentPlayback"),

    // Skipped tracks
    getSkippedTracks: () => ipcRenderer.invoke("spotify:getSkippedTracks"),
    saveSkippedTracks: (tracks: SkippedTrack[]) =>
      ipcRenderer.invoke("spotify:saveSkippedTracks", tracks),
    updateSkippedTrack: (track: SkippedTrack) =>
      ipcRenderer.invoke("spotify:updateSkippedTrack", track),

    // Settings
    saveSettings: (settings: SpotifySettings) =>
      ipcRenderer.invoke("spotify:saveSettings", settings),
    getSettings: () => ipcRenderer.invoke("spotify:getSettings"),

    // Logs - New
    saveLog: (
      message: string,
      level?: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL",
    ) => ipcRenderer.invoke("spotify:saveLog", message, level),
    getLogs: (count?: number) => ipcRenderer.invoke("spotify:getLogs", count),
    clearLogs: () => ipcRenderer.invoke("spotify:clearLogs"),

    // App Control
    restartApp: () => ipcRenderer.invoke("spotify:restartApp"),

    // Service
    startMonitoring: () => ipcRenderer.invoke("spotify:startMonitoring"),
    stopMonitoring: () => ipcRenderer.invoke("spotify:stopMonitoring"),

    // Events
    onPlaybackUpdate: (callback: (data: SpotifyPlaybackInfo) => void) => {
      const subscription = (
        _event: Electron.IpcRendererEvent,
        data: SpotifyPlaybackInfo,
      ) => callback(data);
      ipcRenderer.on("spotify:playbackUpdate", subscription);

      return () => {
        ipcRenderer.removeListener("spotify:playbackUpdate", subscription);
      };
    },
  });
}
