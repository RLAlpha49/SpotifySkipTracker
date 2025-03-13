/**
 * Window Management Module
 *
 * Creates and configures the main application window
 * with appropriate security settings, platform-specific behaviors,
 * and event handlers.
 */

import { app, BrowserWindow, Menu } from "electron";
import path from "path";
import fs from "fs";
import { saveLog, getSettings } from "../../helpers/storage/store";
import { setupSpotifyIPC } from "./spotify-ipc";
import registerListeners from "../../helpers/ipc/listeners-register";
import { cancelAuthFlow } from "../../services/auth";
import {
  stopPlaybackMonitoring,
  isMonitoringActive,
} from "../../services/playback";

// Environment detection
const inDevelopment = process.env.NODE_ENV === "development";

/**
 * Creates and configures the main application window
 *
 * @returns {BrowserWindow} Configured Electron browser window instance
 */
export function createWindow(): BrowserWindow {
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
