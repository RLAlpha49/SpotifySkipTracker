/**
 * Spotify Skip Tracker - Main Process Entry Point
 *
 * Core module controlling the Electron application lifecycle and coordinating modules.
 * Delegates specific functionality to specialized modules.
 */

import { app, BrowserWindow } from "electron";
import { checkForSquirrelEvents } from "./main/installer-events";
import { createWindow } from "./main/window";
import { installExtensions } from "./main/extensions";
import { saveLog } from "../helpers/storage/store";
import {
  isMonitoringActive,
  stopPlaybackMonitoring,
} from "../services/playback-monitor";

// Check for Windows installer events before doing anything else
if (checkForSquirrelEvents()) {
  process.exit(0);
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
