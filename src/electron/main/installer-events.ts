/**
 * Windows Installer Event Handling
 *
 * Handles Squirrel.Windows installation events for proper desktop integration.
 * This module manages shortcut creation/removal and other Windows-specific
 * installation tasks.
 */

import { app } from "electron";
import path from "path";
import { exec } from "child_process";

/**
 * Processes Squirrel.Windows installer events
 *
 * @param command - The Squirrel command received from the installer
 * @returns Whether an event was handled
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
 * @returns True if a Squirrel event was handled and the app should exit
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
