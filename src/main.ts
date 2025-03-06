import { app, BrowserWindow, ipcMain, Menu } from "electron";
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
} from "./helpers/storage/store";

// Import Spotify services
import {
  getCurrentPlayback,
  setTokens as setApiTokens,
  clearTokens as clearApiTokens,
  isTokenValid,
  refreshAccessToken,
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

const inDevelopment = process.env.NODE_ENV === "development";

// Set up the IPC handlers for Spotify services
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
            saveLog("Successfully refreshed access token", "INFO");
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

  ipcMain.handle("spotify:isAuthenticated", async () => {
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
      return isTokenValid();
    }

    return false;
  });

  // Playback handlers
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

  // Skipped tracks handlers
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

  // Settings handlers - Updated to use persistent storage
  ipcMain.handle("spotify:saveSettings", async (_, settings) => {
    console.log("Saving settings:", settings);
    const result = saveSettings(settings);

    // Log the settings save operation
    if (result) {
      saveLog("Settings saved successfully", "INFO");
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

  // Logs handlers
  ipcMain.handle("spotify:saveLog", async (_, message, level = "INFO") => {
    console.log(`Saving log [${level}]:`, message);

    // Let the saveLog function in store.ts handle all deduplication logic
    // No need to duplicate the deduplication logic here
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

  // Service handlers
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

// Create the browser window.
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
    width: 800,
    height: 600,
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
    saveLog("Application started", "INFO");

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
    saveLog("Application closed", "INFO");

    // Stop monitoring if active
    if (isMonitoringActive()) {
      stopPlaybackMonitoring();
    }

    // Cancel auth flow if in progress
    cancelAuthFlow();
  });

  return mainWindow;
}

// Install development extensions
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
  saveLog("Application initializing");

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
  saveLog("All windows closed");
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("quit", () => {
  saveLog("Application quit");

  // Make sure monitoring is stopped
  if (isMonitoringActive()) {
    stopPlaybackMonitoring();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
