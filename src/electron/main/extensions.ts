/**
 * @packageDocumentation
 * @module extensions
 * @description Development Extensions Module
 *
 * Installs development tools and extensions to facilitate debugging
 * and application testing in the Electron environment.
 *
 * Features:
 * - Conditionally loads extensions only in development mode
 * - Installs React Developer Tools for component inspection
 * - Provides proper error handling and logging
 * - Prevents installation in production builds
 *
 * Note: This module has no effect in production builds to maintain security and performance.
 */

import {
  installExtension,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";
import { saveLog } from "../../helpers/storage/store";

// Environment detection
const inDevelopment = process.env.NODE_ENV === "development";

/**
 * Installs development tools and extensions
 *
 * Conditionally installs Electron DevTools extensions based on the current
 * environment. Only activates in development mode to avoid unnecessary
 * overhead in production builds. Logs success or failure for debugging.
 *
 * @returns {Promise<void>} Resolves when extensions are installed or skipped
 * @source
 */
export async function installExtensions(): Promise<void> {
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
