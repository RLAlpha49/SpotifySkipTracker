/**
 * Main Entry Point for Spotify Skip Tracker Electron Application
 *
 * This application monitors Spotify playback and tracks when songs are skipped.
 * It helps users identify songs they frequently skip in their library, allowing them
 * to make data-driven decisions about which tracks to keep or remove.
 *
 * Key Features:
 * - OAuth authentication with Spotify API
 * - Real-time playback monitoring
 * - Skip detection with configurable thresholds
 * - Automatic library management (optional removal of frequently skipped tracks)
 * - Persistent storage of skip statistics
 * - Activity logging with configurable verbosity
 *
 * Application Architecture:
 * - Electron main process (this file) - Controls application lifecycle and sets up IPC
 * - Renderer process - React UI for user interaction
 * - Services - Modules handling specific functionality (auth, playback, storage)
 */

import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
import registerListeners from "./helpers/ipc/listeners-register";
// "electron-squirrel-startup" seems broken when packaging with vite
//import started from "electron-squirrel-startup";
import path from "path";
import {
  installExtension,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";
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
} from "./helpers/storage/store";

// Import Spotify services
import {
  getCurrentPlayback,
  setTokens as setApiTokens,
  clearTokens as clearApiTokens,
  isTokenValid,
  refreshAccessToken,
  getTokenInfo,
  unlikeTrack,
} from "./services/spotify-api";
import {
  startPlaybackMonitoring,
  stopPlaybackMonitoring,
  isMonitoringActive,
} from "./services/playback-monitor";
import { startAuthFlow, cancelAuthFlow } from "./services/oauth-handler";
import {
  saveTokens,
  loadTokens,
  clearTokens as clearStoredTokens,
} from "./services/token-storage";

// Environment detection for development vs. production mode
const inDevelopment = process.env.NODE_ENV === "development";

/**
 * Sets up all IPC (Inter-Process Communication) handlers for Spotify-related functionality.
 * These handlers allow the renderer process (UI) to communicate with the main process
 * and access Spotify API services.
 *
 * @param mainWindow - The main application window instance
 */
function setupSpotifyIPC(mainWindow: BrowserWindow) {
  // Authentication handlers
  ipcMain.handle("spotify:authenticate", async (_, credentials) => {
    try {
      console.log("Authenticating with Spotify...", credentials);

      // Check if we have stored tokens
      const storedTokens = loadTokens();
      if (storedTokens) {
        // If we have tokens, check if they're valid or can be refreshed
        try {
          if (isTokenValid()) {
            // Set the tokens in the API service
            setApiTokens(
              storedTokens.accessToken,
              storedTokens.refreshToken,
              3600,
            );
            saveLog("Using existing valid tokens", "DEBUG");
            return true;
          } else {
            // Try to refresh the token
            await refreshAccessToken(
              credentials.clientId,
              credentials.clientSecret,
            );

            // Get the new tokens and save them to disk
            const tokenInfo = getTokenInfo();
            if (tokenInfo.accessToken && tokenInfo.refreshToken) {
              saveTokens({
                accessToken: tokenInfo.accessToken,
                refreshToken: tokenInfo.refreshToken,
                expiresAt: tokenInfo.expiryTime,
              });
            }

            saveLog("Successfully refreshed and saved access token", "INFO");
            return true;
          }
        } catch (error) {
          saveLog(`Failed to use stored tokens: ${error}`, "DEBUG");
          // Continue to new authentication
        }
      }

      // Start the authentication flow
      try {
        const tokens = await startAuthFlow(
          mainWindow,
          credentials.clientId,
          credentials.clientSecret,
          credentials.redirectUri,
        );

        // Save tokens
        saveTokens({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: Date.now() + tokens.expiresIn * 1000,
        });

        // Also set them in the API service
        setApiTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn);

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
  });

  // Logout handler - Clears tokens and stops monitoring
  ipcMain.handle("spotify:logout", async () => {
    console.log("Logging out from Spotify");

    // Stop monitoring if active
    if (isMonitoringActive()) {
      stopPlaybackMonitoring();
    }

    // Clear tokens
    clearApiTokens();
    clearStoredTokens();

    // Log the logout
    saveLog("Logged out from Spotify", "INFO");

    return true;
  });

  // Authentication status check handler
  ipcMain.handle("spotify:isAuthenticated", async () => {
    try {
      // Try to load tokens from storage
      const storedTokens = loadTokens();

      if (storedTokens) {
        // Set tokens in the API service
        setApiTokens(
          storedTokens.accessToken,
          storedTokens.refreshToken,
          Math.floor((storedTokens.expiresAt - Date.now()) / 1000),
        );

        // Check if token is valid
        if (isTokenValid()) {
          saveLog("Using existing valid tokens from storage", "DEBUG");
          return true;
        } else {
          // Token expired, try to refresh it
          try {
            // Get settings to access client credentials
            const settings = getSettings();
            if (settings.clientId && settings.clientSecret) {
              await refreshAccessToken(
                settings.clientId,
                settings.clientSecret,
              );

              // Update stored tokens with the refreshed token
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
            // Continue to return false
          }
        }
      }

      return false;
    } catch (error) {
      saveLog(`Error checking authentication status: ${error}`, "ERROR");
      return false;
    }
  });

  // Current playback information handler
  ipcMain.handle("spotify:getCurrentPlayback", async () => {
    try {
      const settings = getSettings();

      // Get current playback from Spotify API
      return await getCurrentPlayback(
        settings.clientId || "",
        settings.clientSecret || "",
      );
    } catch (error) {
      saveLog(`Error getting current playback: ${error}`, "ERROR");
      return null;
    }
  });

  // Skipped tracks management handlers
  ipcMain.handle("spotify:getSkippedTracks", async () => {
    const tracks = getSkippedTracks();
    saveLog(`Loaded ${tracks.length} skipped tracks from storage`, "DEBUG");
    return tracks;
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

  ipcMain.handle("spotify:unlikeTrack", async (_, trackId) => {
    console.log("Unliking track from Spotify:", trackId);
    try {
      // Get settings for client credentials
      const settings = getSettings();

      // Call the Spotify API to unlike the track
      // Note: unlikeTrack function expects (clientId, clientSecret, trackId)
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

  // Settings handlers - Uses persistent storage
  ipcMain.handle("spotify:saveSettings", async (_, settings) => {
    const result = saveSettings(settings);

    // Log the settings save operation
    if (result) {
      saveLog("Settings saved successfully", "DEBUG");
    } else {
      saveLog("Failed to save settings", "ERROR");
    }

    return result;
  });

  ipcMain.handle("spotify:getSettings", async () => {
    // Get settings from persistent storage
    const settings = getSettings();
    saveLog("Settings loaded from storage", "DEBUG");
    return settings;
  });

  // Logs management handlers
  ipcMain.handle("spotify:saveLog", async (_, message, level = "INFO") => {
    console.log(`Saving log [${level}]:`, message);

    return saveLog(message, level);
  });

  ipcMain.handle("spotify:getLogs", async (_, count) => {
    return getLogs(count);
  });

  ipcMain.handle("spotify:clearLogs", async () => {
    console.log("Clearing logs");
    const result = clearLogs();
    return result;
  });

  ipcMain.handle("spotify:openLogsDirectory", async () => {
    console.log("Opening logs directory:", logsPath);

    // Use shell to open the directory with the default file explorer
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

    // Use shell to open the directory with the default file explorer
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

  // App control handlers
  ipcMain.handle("spotify:restartApp", async () => {
    console.log("Restarting application...");
    saveLog("Application restart requested by user", "INFO");

    // Schedule the restart after a brief delay to allow the response to be sent
    setTimeout(() => {
      app.relaunch();
      app.exit(0);
    }, 1000);

    return true;
  });

  // Playback monitoring service handlers
  ipcMain.handle("spotify:startMonitoring", async () => {
    console.log("Starting Spotify monitoring...");

    // Get current settings
    const settings = getSettings();

    try {
      // Start monitoring
      const success = startPlaybackMonitoring(
        mainWindow,
        settings.clientId,
        settings.clientSecret,
      );

      if (success) {
        return true;
      } else {
        saveLog("Failed to start playback monitoring", "ERROR");
        return false;
      }
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
}

/**
 * Creates the main application window and configures it.
 * This includes setting up the menu, preload script, and loading the renderer.
 * Also initializes IPC handlers and system event listeners.
 *
 * @returns The created BrowserWindow instance
 */
function createWindow() {
  // Set custom menu (minimal) or no menu
  if (inDevelopment) {
    // Development menu with essential tools
    const devTemplate: Electron.MenuItemConstructorOptions[] = [
      {
        label: "Developer",
        submenu: [
          { role: "reload" },
          { role: "forceReload" },
          { role: "toggleDevTools" },
          { type: "separator" },
          { role: "quit" },
        ],
      },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(devTemplate));
  } else {
    // No menu in production
    Menu.setApplicationMenu(null);
  }

  const preload = path.join(__dirname, "preload.js");
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      devTools: inDevelopment,
      contextIsolation: true,
      nodeIntegration: true,
      webviewTag: true,
      nodeIntegrationInSubFrames: false,
      preload: preload,
    },
    titleBarStyle: "default",
    frame: true,
  });

  // Setup IPC handlers
  setupSpotifyIPC(mainWindow);

  // and load the index.html of the app.
  if (inDevelopment) {
    mainWindow.loadURL("http://localhost:5173/");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../index.html"));
  }

  // Register other IPC handlers
  registerListeners(mainWindow);

  // Once the window is ready, show it
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    saveLog("Application started", "DEBUG");

    // Load configuration when app starts
    try {
      const settings = getSettings();
      // Log configuration info that might be useful for diagnostics
      saveLog(
        `Application initialized with log level: ${settings.logLevel}`,
        "DEBUG",
      );
      saveLog(
        `Skip threshold set to: ${settings.skipThreshold * 100}%`,
        "DEBUG",
      );
    } catch (error) {
      console.error("Error loading initial settings:", error);
      saveLog(`Error loading initial settings: ${error}`, "ERROR");
    }
  });

  // Handle window closed
  mainWindow.on("closed", () => {
    saveLog("Application closed", "DEBUG");

    // Stop monitoring if active
    if (isMonitoringActive()) {
      stopPlaybackMonitoring();
    }

    // Cancel auth flow if in progress
    cancelAuthFlow();
  });

  return mainWindow;
}

/**
 * Installs developer extensions when in development mode.
 * This helps with debugging and development workflows.
 */
async function installExtensions() {
  try {
    if (inDevelopment) {
      const name = await installExtension(REACT_DEVELOPER_TOOLS);
      console.log(`Extensions installed successfully: ${name}`);
      saveLog(`Installed developer extensions: ${name}`, "DEBUG");
    }
  } catch (err) {
    console.error("Error installing extensions:", err);
    saveLog(`Error installing extensions: ${err}`, "ERROR");
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  saveLog("Application initializing", "DEBUG");

  await installExtensions();
  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  saveLog("All windows closed", "DEBUG");
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("quit", () => {
  saveLog("Application quit", "DEBUG");

  // Make sure monitoring is stopped
  if (isMonitoringActive()) {
    stopPlaybackMonitoring();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
