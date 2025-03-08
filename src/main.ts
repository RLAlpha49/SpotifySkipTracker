/**
 * Spotify Skip Tracker - Main Process
 *
 * Core module controlling the Electron application lifecycle and primary functionality.
 * Establishes IPC communication channels, handles authentication, and manages playback monitoring.
 *
 * Core features:
 * - OAuth authentication with Spotify
 * - Real-time playback monitoring
 * - Skip detection with configurable thresholds
 * - Library management integration
 * - Persistent storage for statistics and settings
 * - Comprehensive activity logging
 *
 * Architecture:
 * - Main process (this file): Application lifecycle and IPC handler
 * - Renderer process: React-based UI interface
 * - Service modules: Specialized functionality providers
 */

import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
import path from "path";
import { exec } from "child_process";

// Handle Windows installation events immediately before any other code runs
if (process.platform === "win32") {
  const squirrelCommand = process.argv[1];

  if (squirrelCommand) {
    const handleSquirrelEvent = () => {
      switch (squirrelCommand) {
        case "--squirrel-install":
        case "--squirrel-updated": {
          // Create desktop and start menu shortcuts when the app is installed or updated
          const target = path.basename(process.execPath);
          const updateDotExe = path.resolve(
            path.dirname(process.execPath),
            "..",
            "Update.exe",
          );
          const cmd = `"${updateDotExe}" --createShortcut="${target}"`;
          exec(cmd);
          setTimeout(() => app.quit(), 1000);
          return true;
        }

        case "--squirrel-uninstall": {
          // Remove shortcuts created during installation
          const target = path.basename(process.execPath);
          const updateDotExe = path.resolve(
            path.dirname(process.execPath),
            "..",
            "Update.exe",
          );
          const cmd = `"${updateDotExe}" --removeShortcut="${target}"`;
          exec(cmd);

          // Just exit the app cleanly - Windows will handle the uninstall UI
          console.log("Uninstalling Spotify Skip Tracker...");
          setTimeout(() => app.quit(), 500);
          return true;
        }

        case "--squirrel-obsolete":
          // This is called on the outgoing version of your app before
          // we update to the new version - it's the opposite of
          // --squirrel-updated
          app.quit();
          return true;

        default:
          return false;
      }
    };

    // If we're handling a Squirrel event, exit immediately
    if (handleSquirrelEvent()) {
      process.exit(0);
    }
  }
}

// Continue with the rest of the imports only after checking for Squirrel commands
import registerListeners from "./helpers/ipc/listeners-register";
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
  filterSkippedTracksByTimeframe,
} from "./helpers/storage/store";
import fs from "fs";

// Spotify service imports
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

// Environment detection
const inDevelopment = process.env.NODE_ENV === "development";

/**
 * Configures IPC handlers for Spotify functionality
 *
 * Establishes communication channels between renderer and main processes
 * for all Spotify-related operations including authentication, playback,
 * and library management.
 *
 * @param mainWindow - Main application window instance
 */
function setupSpotifyIPC(mainWindow: BrowserWindow) {
  // Authentication handlers
  ipcMain.handle("spotify:authenticate", async (_, credentials) => {
    try {
      console.log("Authenticating with Spotify...", credentials);

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

            saveLog("Successfully refreshed and saved access token", "INFO");
            return true;
          }
        } catch (error) {
          saveLog(`Failed to use stored tokens: ${error}`, "DEBUG");
          // Proceed to new authentication
        }
      }

      // Initiate new authentication flow
      try {
        const tokens = await startAuthFlow(
          mainWindow,
          credentials.clientId,
          credentials.clientSecret,
          credentials.redirectUri,
        );

        // Persist tokens
        saveTokens({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: Date.now() + tokens.expiresIn * 1000,
        });

        // Initialize API service with tokens
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
          ? filterSkippedTracksByTimeframe(allTracks, timeframeInDays)
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
}

/**
 * Creates and configures the main application window
 *
 * Initializes the browser window with appropriate security settings,
 * configures platform-specific behaviors, and sets up event handlers.
 *
 * @returns {BrowserWindow} Configured Electron browser window instance
 */
function createWindow() {
  // Configure menu based on environment
  if (inDevelopment) {
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

  // Add error capture for renderer process
  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      saveLog(
        `Renderer failed to load: ${errorDescription} (${errorCode})`,
        "ERROR",
      );
    },
  );

  // Initialize communication channels
  setupSpotifyIPC(mainWindow);

  // Load application content
  if (inDevelopment) {
    mainWindow.loadURL("http://localhost:5173/");
  } else {
    // In a packaged app, the HTML file is at the root of the asar archive
    // or in the renderer folder depending on the build configuration
    const indexPath = path.resolve(app.getAppPath(), "index.html");
    const rendererIndexPath = path.resolve(
      app.getAppPath(),
      "renderer",
      "index.html",
    );
    const viteIndexPath = path.resolve(
      app.getAppPath(),
      ".vite",
      "renderer",
      "main_window",
      "index.html",
    );

    // Log the potential paths we'll try
    saveLog(`App path: ${app.getAppPath()}`, "DEBUG");

    try {
      // Try the possible paths in order of likelihood
      if (fs.existsSync(indexPath)) {
        saveLog(`Loading HTML from root: ${indexPath}`, "DEBUG");
        mainWindow.loadURL("file://" + indexPath.replace(/\\/g, "/"));
      } else if (fs.existsSync(rendererIndexPath)) {
        saveLog(
          `Loading HTML from renderer folder: ${rendererIndexPath}`,
          "DEBUG",
        );
        mainWindow.loadURL("file://" + rendererIndexPath.replace(/\\/g, "/"));
      } else if (fs.existsSync(viteIndexPath)) {
        saveLog(`Loading HTML from vite output: ${viteIndexPath}`, "DEBUG");
        mainWindow.loadURL("file://" + viteIndexPath.replace(/\\/g, "/"));
      } else {
        saveLog(
          "Could not find HTML file in standard locations, trying default path",
          "WARNING",
        );
        mainWindow.loadFile("index.html");
      }
    } catch (error) {
      saveLog(`Error loading HTML: ${error}`, "ERROR");
      // A minimal fallback as last resort
      mainWindow.loadURL(`data:text/html;charset=utf-8,
        <html><body><p>Failed to load application. Please check the logs.</p></body></html>
      `);
    }

    if (inDevelopment) {
      mainWindow.webContents.openDevTools();
    }
  }

  // Register additional IPC handlers
  registerListeners(mainWindow);

  // Initialize window and application state
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    saveLog("Application started", "DEBUG");

    try {
      const settings = getSettings();
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

  // Cleanup on window close
  mainWindow.on("closed", () => {
    saveLog("Application closed", "DEBUG");

    if (isMonitoringActive()) {
      stopPlaybackMonitoring();
    }

    cancelAuthFlow();
  });

  return mainWindow;
}

/**
 * Installs development tools and extensions
 *
 * Loads developer tools in development mode to facilitate debugging
 * and application testing.
 *
 * @returns {Promise<void>} Resolves when extensions are installed or skipped
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

// Application initialization
app.whenReady().then(async () => {
  saveLog("Application initializing", "DEBUG");

  await installExtensions();
  createWindow();

  app.on("activate", function () {
    // MacOS dock click behavior
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Window management
app.on("window-all-closed", () => {
  saveLog("All windows closed", "DEBUG");
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Application shutdown
app.on("quit", () => {
  saveLog("Application quit", "DEBUG");

  if (isMonitoringActive()) {
    stopPlaybackMonitoring();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
