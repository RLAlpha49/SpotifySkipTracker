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

const inDevelopment = process.env.NODE_ENV === "development";

// Add Spotify service for handling authentication and API calls
interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

let spotifyTokens: SpotifyTokens | null = null;
let monitoringInterval: NodeJS.Timeout | null = null;

// Track the current playback to detect skips
let currentTrackId: string | null = null;
let lastPlaybackTime: number = 0;
const SKIP_THRESHOLD = 0.7; // 70% of track needs to be played to not count as skip

// Set up the IPC handlers for Spotify services
function setupSpotifyIPC(mainWindow: BrowserWindow) {
  // Authentication handlers
  ipcMain.handle("spotify:authenticate", async (_, credentials) => {
    console.log("Authenticating with Spotify...", credentials);
    // In a real app, this would handle OAuth with Spotify using credentials
    // For now, we'll just simulate success
    spotifyTokens = {
      access_token: "mock_access_token",
      refresh_token: "mock_refresh_token",
      expires_at: Date.now() + 3600000, // 1 hour from now
    };

    // Log the authentication
    saveLog(
      `Authenticated with Spotify using client ID: ${credentials?.clientId || "mock-client-id"}`,
    );
    saveLog(`Successfully authenticated with Spotify`);

    return true;
  });

  ipcMain.handle("spotify:logout", async () => {
    console.log("Logging out from Spotify");
    spotifyTokens = null;
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }

    // Log the logout
    saveLog("Logged out from Spotify");

    return true;
  });

  ipcMain.handle("spotify:isAuthenticated", async () => {
    return !!spotifyTokens;
  });

  // Playback handlers
  ipcMain.handle("spotify:getCurrentPlayback", async () => {
    if (!spotifyTokens) return null;

    // In a real app, this would call the Spotify API
    // For now, return mock data
    const isPlaying = Math.random() > 0.3;

    if (!isPlaying) return null;

    return {
      isPlaying: true,
      trackId: "1234567890",
      trackName: "Mock Track Name",
      artistName: "Mock Artist",
      albumName: "Mock Album",
      albumArt:
        "https://i.scdn.co/image/ab67616d0000b2731290d2196e9874d4060f0764",
      progress: Math.floor(Math.random() * 100),
      duration: 100,
    };
  });

  // Skipped tracks handlers
  ipcMain.handle("spotify:getSkippedTracks", async () => {
    console.log("Getting skipped tracks...");
    const tracks = getSkippedTracks();
    saveLog(`Loaded ${tracks.length} skipped tracks from storage`);
    return tracks;
  });

  ipcMain.handle("spotify:saveSkippedTracks", async (_, tracks) => {
    console.log("Saving skipped tracks...", tracks.length);
    const result = saveSkippedTracks(tracks);
    saveLog(`Saved ${tracks.length} skipped tracks to storage`);
    return result;
  });

  ipcMain.handle("spotify:updateSkippedTrack", async (_, track) => {
    console.log("Updating skipped track...", track.id);
    const result = updateSkippedTrack(track);
    saveLog(
      `Updated skipped track: ${track.name} by ${track.artist} (ID: ${track.id})`,
    );
    return result;
  });

  // Settings handlers - Updated to use persistent storage
  ipcMain.handle("spotify:saveSettings", async (_, settings) => {
    console.log("Saving settings:", settings);
    const result = saveSettings(settings);

    // Log the settings save operation
    if (result) {
      saveLog("Settings saved successfully");
      // No need to send a separate message to the renderer for the toast
      // The toast is shown by the renderer when this handler returns success
    } else {
      saveLog("Failed to save settings");
    }

    return result;
  });

  ipcMain.handle("spotify:getSettings", async () => {
    // Get settings from persistent storage
    const settings = getSettings();
    saveLog("Settings loaded from storage");
    return settings;
  });

  // Logs handlers
  ipcMain.handle("spotify:saveLog", async (_, message) => {
    console.log("Saving log:", message);
    return saveLog(message);
  });

  ipcMain.handle("spotify:getLogs", async (_, count) => {
    console.log("Getting logs, count:", count);
    return getLogs(count);
  });

  ipcMain.handle("spotify:clearLogs", async () => {
    console.log("Clearing logs");
    const result = clearLogs();
    if (result) {
      saveLog("Log history cleared");
    }
    return result;
  });

  // App control handlers
  ipcMain.handle("spotify:restartApp", async () => {
    console.log("Restarting application...");
    saveLog("Application restart requested by user");

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
    saveLog("Started Spotify playback monitoring");

    // In a real app, this would start polling the Spotify API

    // Clear any existing interval
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
    }

    // Set up monitoring interval
    monitoringInterval = setInterval(async () => {
      try {
        // In a real app, this would be the response from Spotify API
        // For now, simulate random playback
        const isPlaying = Math.random() > 0.2; // 80% chance of playing

        if (isPlaying) {
          // Generate random track data
          const trackId = `track_${Math.floor(Math.random() * 1000)}`;
          const trackName = `Track ${Math.floor(Math.random() * 100)}`;
          const artistName = `Artist ${Math.floor(Math.random() * 20)}`;
          const albumName = `Album ${Math.floor(Math.random() * 50)}`;
          const duration = Math.floor(Math.random() * 300) + 120; // 2-5 minutes
          const progress = Math.random(); // 0-1 progress through track

          // Check if track has changed and handle skip detection
          if (currentTrackId && currentTrackId !== trackId) {
            // If track changed and less than threshold was played, count as skip
            const settings = getSettings();
            const skipThreshold = settings.skipThreshold || SKIP_THRESHOLD;

            if (lastPlaybackTime < skipThreshold) {
              // This is a skip - if we have previous track info, record it
              if (currentTrackId) {
                console.log(
                  `Track skipped: ${currentTrackId} at ${Math.round(lastPlaybackTime * 100)}%`,
                );
                saveLog(
                  `Track skipped: ${currentTrackId} at ${Math.round(lastPlaybackTime * 100)}%`,
                );

                // Update skipped track in storage
                updateSkippedTrack({
                  id: currentTrackId,
                  name: `Track ${currentTrackId.split("_")[1]}`, // Just for demo
                  artist: "Demo Artist", // Just for demo
                  skipCount: 1, // This will be incremented in the function
                  lastSkipped: new Date().toISOString(),
                });
              }
            } else {
              // Track was played sufficiently
              saveLog(
                `Track completed: ${currentTrackId} (${Math.round(lastPlaybackTime * 100)}%)`,
              );
            }
          }

          // Log first play of a track
          if (currentTrackId !== trackId) {
            saveLog(`Now playing: ${trackName} by ${artistName}`);
          }

          // Update current track info
          currentTrackId = trackId;
          lastPlaybackTime = progress;

          // Send update to renderer
          mainWindow.webContents.send("spotify:playbackUpdate", {
            isPlaying,
            trackId,
            trackName,
            artistName,
            albumName,
            albumArt: `https://picsum.photos/seed/${trackId}/300/300`, // Random image
            progress: Math.round(progress * 100),
            duration,
            isInPlaylist: Math.random() > 0.5, // 50% chance of being in playlist
          });
        } else {
          // If nothing is playing, reset tracking
          currentTrackId = null;
          lastPlaybackTime = 0;

          // Send update to renderer that nothing is playing
          mainWindow.webContents.send("spotify:playbackUpdate", {
            isPlaying: false,
            trackId: "",
            trackName: "",
            artistName: "",
            albumName: "",
            albumArt: "",
            progress: 0,
            duration: 0,
            isInPlaylist: false,
          });
        }
      } catch (error) {
        console.error("Error in playback monitoring:", error);
        saveLog(`Error in playback monitoring: ${error}`);
      }
    }, 3000); // Check every 3 seconds

    return true;
  });

  ipcMain.handle("spotify:stopMonitoring", async () => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
      saveLog("Stopped Spotify playback monitoring");
    }
    return true;
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
    saveLog("Application started");

    // Load configuration when app starts
    try {
      const settings = getSettings();
      console.log("Loaded initial settings:", settings);
    } catch (error) {
      console.error("Error loading initial settings:", error);
      saveLog(`Error loading initial settings: ${error}`);
    }
  });

  // Handle window closed
  mainWindow.on("closed", () => {
    saveLog("Application closed");
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }
  });

  return mainWindow;
}

// Install development extensions
async function installExtensions() {
  try {
    if (inDevelopment) {
      const name = await installExtension(REACT_DEVELOPER_TOOLS);
      console.log(`Extensions installed successfully: ${name}`);
      saveLog(`Installed developer extensions: ${name}`);
    }
  } catch (err) {
    console.error("Error installing extensions:", err);
    saveLog(`Error installing extensions: ${err}`);
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
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
