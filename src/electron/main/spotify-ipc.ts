/**
 * Spotify IPC Handler Module
 *
 * Establishes communication channels between renderer and main processes
 * for all Spotify-related operations including authentication, playback,
 * and library management.
 */

import { BrowserWindow, ipcMain, shell, app } from "electron";
import {
  saveSettings,
  getSettings,
  saveLog,
  getLogs,
  clearLogs,
  getSkippedTracks,
  saveSkippedTracks,
  updateSkippedTrack,
  logsPath,
  skipsPath,
  removeSkippedTrack,
  filterSkippedTracksByTimeframe,
} from "../../helpers/storage/store";

// Spotify service imports
import {
  getCurrentPlayback,
  setTokens as setApiTokens,
  clearTokens as clearApiTokens,
  isTokenValid,
  refreshAccessToken,
  getTokenInfo,
  unlikeTrack,
  pause,
  play,
  skipToPrevious,
  skipToNext,
} from "../../services/spotify-api";
import {
  startPlaybackMonitoring,
  stopPlaybackMonitoring,
  isMonitoringActive,
} from "../../services/playback-monitor";
import {
  startAuthFlow,
  clearSpotifyAuthData,
} from "../../services/oauth-handler";
import {
  saveTokens,
  loadTokens,
  clearTokens as clearStoredTokens,
} from "../../services/token-storage";

/**
 * Configures IPC handlers for Spotify functionality
 *
 * @param mainWindow - Main application window instance
 */
export function setupSpotifyIPC(mainWindow: BrowserWindow): void {
  // Authentication handlers
  ipcMain.handle(
    "spotify:authenticate",
    async (_, credentials, forceAuth = false) => {
      try {
        console.log(
          "Authenticating with Spotify...",
          credentials,
          forceAuth ? "(forced)" : "",
        );

        // Clear tokens if force authentication is requested
        if (forceAuth) {
          clearApiTokens();
          clearStoredTokens();

          // Also clear browser cookies and storage for Spotify
          try {
            await clearSpotifyAuthData();
          } catch (error) {
            saveLog(`Error clearing Spotify auth data: ${error}`, "ERROR");
          }

          saveLog(
            "Forcing new authentication flow with cleared tokens and cookies",
            "DEBUG",
          );
        }
        // Skip stored token check if force authentication is requested
        else if (!forceAuth) {
          // Attempt to use stored tokens
          const storedTokens = loadTokens();
          if (storedTokens) {
            try {
              if (isTokenValid()) {
                // Set valid tokens in API service
                setApiTokens(
                  storedTokens.accessToken,
                  storedTokens.refreshToken,
                  3600,
                );
                saveLog("Using existing valid tokens", "DEBUG");
                return true;
              } else {
                // Refresh expired token
                await refreshAccessToken(
                  credentials.clientId,
                  credentials.clientSecret,
                );

                // Update stored tokens
                const tokenInfo = getTokenInfo();
                if (tokenInfo.accessToken && tokenInfo.refreshToken) {
                  saveTokens({
                    accessToken: tokenInfo.accessToken,
                    refreshToken: tokenInfo.refreshToken,
                    expiresAt: tokenInfo.expiryTime,
                  });
                }

                saveLog(
                  "Successfully refreshed and saved access token",
                  "INFO",
                );
                return true;
              }
            } catch (error) {
              console.error("Error using stored tokens:", error);
              // Fall through to OAuth flow on token error
            }
          }
        } else {
          saveLog("Forcing new authentication flow", "DEBUG");
        }

        // Initiate new authentication flow
        try {
          const tokens = await startAuthFlow(
            mainWindow,
            credentials.clientId,
            credentials.clientSecret,
            credentials.redirectUri,
            forceAuth,
          );

          // Persist tokens
          saveTokens({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: Date.now() + tokens.expiresIn * 1000,
          });

          // Initialize API service with tokens
          setApiTokens(
            tokens.accessToken,
            tokens.refreshToken,
            tokens.expiresIn,
          );

          saveLog("Successfully authenticated with Spotify", "INFO");
          return true;
        } catch (error) {
          saveLog(`Authentication failed: ${error}`, "ERROR");
          return false;
        }
      } catch (error) {
        saveLog(`Authentication error: ${error}`, "ERROR");
        return false;
      }
    },
  );

  // Logout handler
  ipcMain.handle("spotify:logout", async () => {
    console.log("Logging out from Spotify");

    // Terminate active monitoring
    if (isMonitoringActive()) {
      stopPlaybackMonitoring();
    }

    // Clear authentication state
    clearApiTokens();
    clearStoredTokens();

    // Clear cookies for Spotify domains to ensure proper logout
    try {
      await clearSpotifyAuthData();
    } catch (error) {
      saveLog(`Error clearing Spotify cookies: ${error}`, "ERROR");
    }

    saveLog("Logged out from Spotify", "INFO");
    return true;
  });

  // Authentication status verification
  ipcMain.handle("spotify:isAuthenticated", async () => {
    try {
      const storedTokens = loadTokens();

      if (storedTokens) {
        // Initialize API with stored tokens
        setApiTokens(
          storedTokens.accessToken,
          storedTokens.refreshToken,
          Math.floor((storedTokens.expiresAt - Date.now()) / 1000),
        );

        if (isTokenValid()) {
          saveLog("Using existing valid tokens from storage", "DEBUG");
          return true;
        } else {
          // Attempt token refresh
          try {
            const settings = getSettings();
            if (settings.clientId && settings.clientSecret) {
              await refreshAccessToken(
                settings.clientId,
                settings.clientSecret,
              );

              // Update token storage
              const tokenInfo = await getTokenInfo();
              if (tokenInfo.accessToken && tokenInfo.refreshToken) {
                saveTokens({
                  accessToken: tokenInfo.accessToken,
                  refreshToken: tokenInfo.refreshToken,
                  expiresAt: tokenInfo.expiryTime,
                });

                saveLog("Successfully refreshed and saved tokens", "DEBUG");
                return true;
              }
            }
          } catch (error) {
            saveLog(`Failed to refresh token: ${error}`, "WARNING");
          }
        }
      }

      return false;
    } catch (error) {
      saveLog(`Error checking authentication status: ${error}`, "ERROR");
      return false;
    }
  });

  // Playback information retrieval
  ipcMain.handle("spotify:getCurrentPlayback", async () => {
    try {
      const settings = getSettings();
      return await getCurrentPlayback(
        settings.clientId || "",
        settings.clientSecret || "",
      );
    } catch (error) {
      saveLog(`Error getting current playback: ${error}`, "ERROR");
      return null;
    }
  });

  // Skipped tracks management
  ipcMain.handle("spotify:getSkippedTracks", async () => {
    try {
      // Get the timeframe setting
      const settings = getSettings();
      const timeframeInDays = settings.timeframeInDays || 0;

      // Get all tracks first
      const allTracks = getSkippedTracks();

      // Apply timeframe filter if needed
      const tracks =
        timeframeInDays > 0
          ? filterSkippedTracksByTimeframe(timeframeInDays)
          : allTracks;

      saveLog(
        `Loaded ${tracks.length} skipped tracks from storage (filtered by ${timeframeInDays} day timeframe)`,
        "DEBUG",
      );
      return tracks;
    } catch (error) {
      saveLog(`Error loading skipped tracks: ${error}`, "ERROR");
      return [];
    }
  });

  // Add a handler specifically for refreshing skipped tracks data
  ipcMain.handle("spotify:refreshSkippedTracks", async () => {
    try {
      // Get the timeframe setting
      const settings = getSettings();
      const timeframeInDays = settings.timeframeInDays || 0;

      // Get all tracks first
      const allTracks = getSkippedTracks();

      // Apply timeframe filter if needed
      const tracks =
        timeframeInDays > 0
          ? filterSkippedTracksByTimeframe(timeframeInDays)
          : allTracks;

      return tracks;
    } catch (error) {
      saveLog(`Error refreshing skipped tracks: ${error}`, "ERROR");
      return [];
    }
  });

  ipcMain.handle("spotify:saveSkippedTracks", async (_, tracks) => {
    console.log("Saving skipped tracks...", tracks.length);
    const result = saveSkippedTracks(tracks);
    saveLog(`Saved ${tracks.length} skipped tracks to storage`, "DEBUG");
    return result;
  });

  ipcMain.handle("spotify:updateSkippedTrack", async (_, track) => {
    console.log("Updating skipped track...", track.id);
    const result = updateSkippedTrack(track);
    saveLog(
      `Updated skipped track: ${track.name} by ${track.artist} (ID: ${track.id})`,
      "DEBUG",
    );
    return result;
  });

  ipcMain.handle("spotify:removeFromSkippedData", async (_, trackId) => {
    console.log("Removing track from skipped data:", trackId);
    try {
      const result = removeSkippedTrack(trackId);

      if (!result) {
        saveLog(
          `Failed to remove track ${trackId} from skipped data`,
          "WARNING",
        );
      }

      return result;
    } catch (error) {
      saveLog(
        `Error removing track ${trackId} from skipped data: ${error}`,
        "ERROR",
      );
      return false;
    }
  });

  // Library management
  ipcMain.handle("spotify:unlikeTrack", async (_, trackId) => {
    console.log("Unliking track from Spotify:", trackId);
    try {
      const settings = getSettings();

      const result = await unlikeTrack(
        settings.clientId,
        settings.clientSecret,
        trackId,
      );

      if (result) {
        saveLog(
          `Successfully unliked track ${trackId} from Spotify library`,
          "INFO",
        );
      } else {
        saveLog(
          `Failed to unlike track ${trackId} from Spotify library`,
          "WARNING",
        );
      }

      return result;
    } catch (error) {
      saveLog(`Error unliking track ${trackId}: ${error}`, "ERROR");
      return false;
    }
  });

  // Settings persistence
  ipcMain.handle("spotify:saveSettings", async (_, settings) => {
    const result = saveSettings(settings);

    if (result) {
      saveLog("Settings saved successfully", "DEBUG");
    } else {
      saveLog("Failed to save settings", "ERROR");
    }

    return result;
  });

  ipcMain.handle("spotify:getSettings", async () => {
    const settings = getSettings();
    saveLog("Settings loaded from storage", "DEBUG");
    return settings;
  });

  // Logging system
  ipcMain.handle("spotify:saveLog", async (_, message, level = "INFO") => {
    console.log(`Saving log [${level}]:`, message);
    return saveLog(message, level);
  });

  ipcMain.handle("spotify:getLogs", async (_, count) => {
    return getLogs(count);
  });

  ipcMain.handle("spotify:clearLogs", async () => {
    console.log("Clearing logs");
    return clearLogs();
  });

  // File system access
  ipcMain.handle("spotify:openLogsDirectory", async () => {
    console.log("Opening logs directory:", logsPath);

    shell.openPath(logsPath).then((error) => {
      if (error) {
        console.error("Failed to open logs directory:", error);
        saveLog(`Failed to open logs directory: ${error}`, "ERROR");
        return false;
      }
      saveLog("Opened logs directory", "INFO");
      return true;
    });

    return true;
  });

  ipcMain.handle("spotify:openSkipsDirectory", async () => {
    console.log("Opening skips directory:", skipsPath);

    shell.openPath(skipsPath).then((error) => {
      if (error) {
        console.error("Failed to open skips directory:", error);
        saveLog(`Failed to open skips directory: ${error}`, "ERROR");
        return false;
      }
      saveLog("Opened skips directory", "INFO");
      return true;
    });

    return true;
  });

  // Application lifecycle
  ipcMain.handle("spotify:restartApp", async () => {
    console.log("Restarting application...");
    saveLog("Application restart requested by user", "INFO");

    // Delay restart to allow response transmission
    setTimeout(() => {
      app.relaunch();
      app.exit(0);
    }, 1000);

    return true;
  });

  // Playback monitoring
  ipcMain.handle("spotify:startMonitoring", async () => {
    console.log("Starting Spotify monitoring...");
    const settings = getSettings();

    try {
      const success = startPlaybackMonitoring(
        mainWindow,
        settings.clientId,
        settings.clientSecret,
      );

      if (!success) {
        saveLog("Failed to start playback monitoring", "ERROR");
      }

      return success;
    } catch (error) {
      saveLog(`Error starting monitoring: ${error}`, "ERROR");
      return false;
    }
  });

  ipcMain.handle("spotify:stopMonitoring", async () => {
    try {
      return stopPlaybackMonitoring();
    } catch (error) {
      saveLog(`Error stopping monitoring: ${error}`, "ERROR");
      return false;
    }
  });

  ipcMain.handle("spotify:isMonitoringActive", async () => {
    try {
      return isMonitoringActive();
    } catch (error) {
      saveLog(`Failed to check monitoring status: ${error}`, "ERROR");
      return false;
    }
  });

  // Playback Control Handlers
  ipcMain.handle("spotify:pausePlayback", async () => {
    try {
      if (!isTokenValid()) {
        saveLog(
          "Cannot pause playback: Not authenticated with Spotify",
          "ERROR",
        );
        return false;
      }

      await pause();
      saveLog("Paused Spotify playback", "INFO");
      return true;
    } catch (error) {
      saveLog(`Failed to pause playback: ${error}`, "ERROR");
      return false;
    }
  });

  ipcMain.handle("spotify:resumePlayback", async () => {
    try {
      if (!isTokenValid()) {
        saveLog(
          "Cannot resume playback: Not authenticated with Spotify",
          "ERROR",
        );
        return false;
      }

      await play();
      saveLog("Resumed Spotify playback", "INFO");
      return true;
    } catch (error) {
      saveLog(`Failed to resume playback: ${error}`, "ERROR");
      return false;
    }
  });

  ipcMain.handle("spotify:skipToPreviousTrack", async () => {
    try {
      if (!isTokenValid()) {
        saveLog(
          "Cannot skip to previous track: Not authenticated with Spotify",
          "ERROR",
        );
        return false;
      }

      await skipToPrevious();
      saveLog("Skipped to previous track", "INFO");
      return true;
    } catch (error) {
      saveLog(`Failed to skip to previous track: ${error}`, "ERROR");
      return false;
    }
  });

  ipcMain.handle("spotify:skipToNextTrack", async () => {
    try {
      if (!isTokenValid()) {
        saveLog(
          "Cannot skip to next track: Not authenticated with Spotify",
          "ERROR",
        );
        return false;
      }

      await skipToNext();
      saveLog("Skipped to next track", "INFO");
      return true;
    } catch (error) {
      saveLog(`Failed to skip to next track: ${error}`, "ERROR");
      return false;
    }
  });
}
