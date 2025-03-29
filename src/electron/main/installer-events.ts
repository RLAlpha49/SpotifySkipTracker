/**
 * @packageDocumentation
 * @module installer-events
 * @description Windows Installer Event Handling Module
 *
 * Handles Squirrel.Windows installation events for proper desktop integration.
 * This module manages shortcut creation/removal and other Windows-specific
 * installation tasks during application install, update, and uninstall processes.
 *
 * Supported installation events:
 * - Installation (--squirrel-install)
 * - Update (--squirrel-updated)
 * - Uninstallation (--squirrel-uninstall)
 * - Old version removal (--squirrel-obsolete)
 *
 * Note: This module only applies to Windows platform installations.
 */

import { exec } from "child_process";
import { app } from "electron";
import path from "path";

/**
 * Processes Squirrel.Windows installer events
 *
 * Handles specific Squirrel commands for Windows desktop integration,
 * creating or removing shortcuts and performing necessary installation tasks.
 * Exits the app after handling installation events.
 *
 * @param command - The Squirrel command received from the installer (from process.argv)
 * @returns {boolean} True if an event was handled, false otherwise
 * @source
 */
export function handleSquirrelEvent(command?: string): boolean {
  if (process.platform !== "win32" || !command) {
    return false;
  }

  switch (command) {
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
}

/**
 * Checks if the application is being started by Squirrel installer
 *
 * Examines command line arguments to determine if the application
 * was launched by the Squirrel installer and handles any installation events.
 * This function should be called at the very beginning of app startup.
 *
 * @returns {boolean} True if a Squirrel event was handled and the app should exit
 * @source
 */
export function checkForSquirrelEvents(): boolean {
  if (process.platform !== "win32") {
    return false;
  }

  const squirrelCommand = process.argv[1];
  if (squirrelCommand && handleSquirrelEvent(squirrelCommand)) {
    // Exit application if we're handling a Squirrel event
    return true;
  }

  return false;
}
