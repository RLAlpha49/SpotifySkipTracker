/**
 * @packageDocumentation
 * @module main
 * @description Main Process Entry Point
 *
 * Core module controlling the Electron application lifecycle and coordinating modules.
 * Delegates specific functionality to specialized modules for better maintainability.
 *
 * Functionality:
 * - Handles application initialization and shutdown
 * - Manages window lifecycle events
 * - Coordinates with Windows installer events
 * - Initializes extension installation
 * - Sets up statistics services
 * - Ensures proper cleanup on application exit
 */

import { app, BrowserWindow } from "electron";
import { saveLog } from "../helpers/storage/store";
import {
  isMonitoringActive,
  stopPlaybackMonitoring,
} from "../services/playback";
import { installExtensions } from "./main/extensions";
import { checkForSquirrelEvents } from "./main/installer-events";
import {
  initializeStatisticsServices,
  shutdownStatisticsServices,
} from "./main/statistics-setup";
import { createWindow } from "./main/window";

// Check for Windows installer events before doing anything else
if (checkForSquirrelEvents()) {
  process.exit(0);
}

// Application initialization
app.whenReady().then(async () => {
  saveLog("Application initializing", "DEBUG");

  await installExtensions();

  // Create the main window
  const mainWindow = createWindow();

  // Initialize statistics services with the mainWindow
  await initializeStatisticsServices(mainWindow);

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

  // Shutdown statistics services
  shutdownStatisticsServices();
});
