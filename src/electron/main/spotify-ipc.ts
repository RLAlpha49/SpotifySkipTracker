/**
 * Spotify IPC Handler Module
 *
 * Establishes communication channels between renderer and main processes
 * for all Spotify-related operations including authentication, playback,
 * and library management.
 */

import { app, BrowserWindow, ipcMain, shell } from "electron";
import {
  clearLogs,
  clearStatistics,
  filterSkippedTracksByTimeframe,
  getAvailableLogFiles,
  getLogs,
  getLogsFromFile,
  getSettings,
  getSkippedTracks,
  getStatistics,
  logsPath,
  removeSkippedTrack,
  resetSettings,
  saveLog,
  saveSettings,
  saveSkippedTracks,
  skipsPath,
  updateSkippedTrack,
} from "../../helpers/storage/store";

// Spotify service imports
import axios from "axios";
import {
  clearTokens as clearStoredTokens,
  loadTokens,
  saveTokens,
} from "../../helpers/storage/token-store";
import { clearSpotifyAuthData, startAuthFlow } from "../../services/auth";
import {
  isMonitoringActive,
  startPlaybackMonitoring,
  stopPlaybackMonitoring,
} from "../../services/playback";
import {
  getCurrentPlayback,
  hasCredentials,
  isTokenValid,
  pause,
  play,
  setTokens as setApiTokens,
  setCredentials,
  skipToNext,
  skipToPrevious,
  unlikeTrack,
} from "../../services/spotify";
import {
  getAccessToken,
  getRefreshToken,
  getTokenInfo as getSpotifyTokenInfo,
  refreshAccessToken as refreshSpotifyToken,
  setTokens as setSpotifyApiTokens,
} from "../../services/spotify/token";

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

        // Set shared credentials in the API first
        setCredentials(credentials.clientId, credentials.clientSecret);

        // Clear tokens if force authentication is requested
        if (forceAuth) {
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
              const now = Date.now();
              const expiresIn = Math.max(
                0,
                (storedTokens.expiresAt - now) / 1000,
              );

              // If token has already expired or is about to expire in less than 2 minutes,
              // don't try to use it and go directly to refresh
              if (expiresIn > 120) {
                // Set valid tokens in API service
                setSpotifyApiTokens(
                  storedTokens.accessToken,
                  storedTokens.refreshToken,
                  Math.floor(expiresIn),
                );
                saveLog("Using existing valid tokens from storage", "DEBUG");

                // Verify token with a quick API call
                try {
                  await axios.get("https://api.spotify.com/v1/me", {
                    headers: {
                      Authorization: `Bearer ${storedTokens.accessToken}`,
                    },
                  });
                  saveLog("Verified token is valid with Spotify API", "DEBUG");
                  return true;
                } catch (apiError) {
                  saveLog(
                    `Token validation failed, refreshing: ${apiError}`,
                    "DEBUG",
                  );
                  // Fall through to token refresh
                }
              } else {
                saveLog(
                  `Token expired or about to expire (${expiresIn}s remaining), refreshing`,
                  "DEBUG",
                );
              }

              // Refresh expired token
              await refreshSpotifyToken();

              // Update stored tokens
              const tokenInfo = getSpotifyTokenInfo();
              if (tokenInfo.hasAccessToken && tokenInfo.hasRefreshToken) {
                // We need the actual values here since the token info doesn't contain the actual tokens
                const loadedTokens = loadTokens();
                if (loadedTokens) {
                  saveTokens({
                    accessToken: getAccessToken() || loadedTokens.accessToken,
                    refreshToken:
                      getRefreshToken() || loadedTokens.refreshToken,
                    expiresAt: Date.now() + tokenInfo.expiresIn * 1000,
                  });
                }
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
      const settings = getSettings();

      // Ensure credentials are set
      setCredentials(settings.clientId, settings.clientSecret);

      if (storedTokens) {
        // Initialize API with stored tokens
        const now = Date.now();
        const expiresIn = Math.max(0, (storedTokens.expiresAt - now) / 1000);

        setSpotifyApiTokens(
          storedTokens.accessToken,
          storedTokens.refreshToken,
          Math.floor(expiresIn),
        );

        // If token has already expired or is about to expire in less than 2 minutes,
        // don't try to use it and go directly to refresh
        if (expiresIn > 120) {
          // Verify token with a quick API call
          try {
            await axios.get("https://api.spotify.com/v1/me", {
              headers: {
                Authorization: `Bearer ${storedTokens.accessToken}`,
              },
            });
            saveLog("Verified token is valid with Spotify API", "DEBUG");
            return true;
          } catch (apiError) {
            saveLog(
              `Token validation failed, attempting refresh: ${apiError}`,
              "DEBUG",
            );
            // Fall through to token refresh
          }
        } else {
          saveLog(
            `Token expired or about to expire (${expiresIn}s remaining), refreshing`,
            "DEBUG",
          );
        }

        // Attempt token refresh
        try {
          if (hasCredentials()) {
            await refreshSpotifyToken();

            // Update token storage with the newest tokens
            const tokenInfo = getSpotifyTokenInfo();
            if (tokenInfo.hasAccessToken && tokenInfo.hasRefreshToken) {
              saveTokens({
                accessToken: getAccessToken() || storedTokens.accessToken,
                refreshToken: getRefreshToken() || storedTokens.refreshToken,
                expiresAt: Date.now() + tokenInfo.expiresIn * 1000,
              });

              saveLog("Successfully refreshed and saved tokens", "DEBUG");
              return true;
            }
          } else {
            saveLog("Cannot refresh token: Credentials not set", "WARNING");
          }
        } catch (error) {
          saveLog(`Failed to refresh token: ${error}`, "WARNING");
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

      // Set credentials before making the call
      setCredentials(settings.clientId, settings.clientSecret);

      // Call with new signature
      return await getCurrentPlayback(true);
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

      // Set credentials before making the call
      setCredentials(settings.clientId, settings.clientSecret);

      // Call with new signature
      const result = await unlikeTrack(trackId);

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

  ipcMain.handle("spotify:resetSettings", async () => {
    const result = resetSettings();

    if (result) {
      saveLog("Settings reset to defaults successfully", "INFO");
    } else {
      saveLog("Failed to reset settings to defaults", "ERROR");
    }

    return result;
  });

  // Logging system
  ipcMain.handle("spotify:saveLog", async (_, message, level = "INFO") => {
    console.log(`Saving log [${level}]:`, message);
    return saveLog(message, level);
  });

  ipcMain.handle("spotify:getLogs", async (_, count) => {
    return getLogs(count);
  });

  ipcMain.handle("spotify:getAvailableLogFiles", async () => {
    return getAvailableLogFiles();
  });

  ipcMain.handle("spotify:getLogsFromFile", async (_, fileName, count) => {
    return getLogsFromFile(fileName, count);
  });

  ipcMain.handle("spotify:clearLogs", async () => {
    console.log("Clearing logs");
    return clearLogs();
  });

  // File system access
  ipcMain.handle("spotify:openLogsDirectory", async () => {
    console.log("Opening logs directory:", logsPath);

    try {
      const error = await shell.openPath(logsPath);
      if (error) {
        console.error("Failed to open logs directory:", error);
        saveLog(`Failed to open logs directory: ${error}`, "ERROR");
        return false;
      }
      saveLog("Opened logs directory", "INFO");
      return true;
    } catch (error) {
      console.error("Error opening logs directory:", error);
      saveLog(`Error opening logs directory: ${error}`, "ERROR");
      return false;
    }
  });

  ipcMain.handle("spotify:openSkipsDirectory", async () => {
    console.log("Opening skips directory:", skipsPath);

    try {
      const error = await shell.openPath(skipsPath);
      if (error) {
        console.error("Failed to open skips directory:", error);
        saveLog(`Failed to open skips directory: ${error}`, "ERROR");
        return false;
      }
      saveLog("Opened skips directory", "INFO");
      return true;
    } catch (error) {
      console.error("Error opening skips directory:", error);
      saveLog(`Error opening skips directory: ${error}`, "ERROR");
      return false;
    }
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
      // First notify UI that we're initializing
      mainWindow.webContents.send("spotify:monitoring-status", {
        status: "initializing",
        message: "Initializing Spotify connection...",
      });

      // Credentials are set in startPlaybackMonitoring
      const success = startPlaybackMonitoring(
        mainWindow,
        settings.clientId,
        settings.clientSecret,
      );

      if (!success) {
        saveLog("Failed to start playback monitoring", "ERROR");
        // Notify UI of failure
        mainWindow.webContents.send("spotify:monitoring-status", {
          status: "error",
          message: "Failed to start monitoring",
          details: "Check log for details",
        });
      } else {
        // Notify UI of success
        mainWindow.webContents.send("spotify:monitoring-status", {
          status: "active",
          message: "Monitoring active",
        });
      }

      return success;
    } catch (error) {
      saveLog(`Error starting monitoring: ${error}`, "ERROR");
      // Notify UI of error
      mainWindow.webContents.send("spotify:monitoring-status", {
        status: "error",
        message: "Error starting monitoring",
        details: String(error),
      });
      return false;
    }
  });

  ipcMain.handle("spotify:stopMonitoring", async () => {
    try {
      // Notify UI that we're stopping
      mainWindow.webContents.send("spotify:monitoring-status", {
        status: "initializing",
        message: "Stopping monitoring service...",
      });

      const success = stopPlaybackMonitoring();

      if (success) {
        // Notify UI that monitoring stopped
        mainWindow.webContents.send("spotify:monitoring-status", {
          status: "inactive",
          message: "Monitoring stopped",
        });
      } else {
        // Notify UI of failure
        mainWindow.webContents.send("spotify:monitoring-status", {
          status: "error",
          message: "Failed to stop monitoring",
          details: "The service may be in an inconsistent state",
        });
      }

      return success;
    } catch (error) {
      saveLog(`Error stopping monitoring: ${error}`, "ERROR");
      // Notify UI of error
      mainWindow.webContents.send("spotify:monitoring-status", {
        status: "error",
        message: "Error stopping monitoring",
        details: String(error),
      });
      return false;
    }
  });

  ipcMain.handle("spotify:isMonitoringActive", async () => {
    try {
      const active = isMonitoringActive();
      // Notify UI of current status
      mainWindow.webContents.send("spotify:monitoring-status", {
        status: active ? "active" : "inactive",
        message: active ? "Monitoring is active" : "Monitoring is inactive",
      });
      return active;
    } catch (error) {
      saveLog(`Failed to check monitoring status: ${error}`, "ERROR");
      return false;
    }
  });

  // Add a handler for getting detailed monitoring status
  ipcMain.handle("spotify:getMonitoringStatus", async () => {
    try {
      const active = isMonitoringActive();
      return {
        active,
        status: active ? "active" : "inactive",
        message: active ? "Monitoring is active" : "Monitoring is inactive",
      };
    } catch (error) {
      saveLog(`Error getting monitoring status: ${error}`, "ERROR");
      return {
        active: false,
        status: "error",
        message: "Error checking monitoring status",
        details: String(error),
      };
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

  // Statistics handlers
  ipcMain.handle("spotify:getStatistics", async () => {
    try {
      saveLog("Retrieving statistics data", "DEBUG");
      const stats = await getStatistics();
      return stats;
    } catch (error) {
      saveLog(`Error retrieving statistics: ${error}`, "ERROR");
      throw new Error(`Failed to get statistics: ${error}`);
    }
  });

  ipcMain.handle("spotify:clearStatistics", async () => {
    try {
      saveLog("Clearing statistics data", "INFO");
      const result = await clearStatistics();
      return result;
    } catch (error) {
      saveLog(`Error clearing statistics: ${error}`, "ERROR");
      return false;
    }
  });

  // URL and file system handling
  ipcMain.handle("spotify:openURL", async (_, url) => {
    try {
      console.log("Opening URL in default browser:", url);
      // Open URL in default browser
      await shell.openExternal(url);
      saveLog(`Opened URL in default browser: ${url}`, "INFO");
      return true;
    } catch (error) {
      console.error("Failed to open URL:", error);
      saveLog(`Failed to open URL in default browser: ${error}`, "ERROR");
      return false;
    }
  });

  ipcMain.handle("spotify:showItemInFolder", async (_, path) => {
    try {
      console.log("Showing item in folder:", path);
      await shell.showItemInFolder(path);
      saveLog(`Showed item in folder: ${path}`, "INFO");
      return true;
    } catch (error) {
      console.error("Failed to show item in folder:", error);
      saveLog(`Failed to show item in folder: ${error}`, "ERROR");
      return false;
    }
  });
}
