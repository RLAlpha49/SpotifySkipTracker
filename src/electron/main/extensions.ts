/**
 * Development Extensions Module
 *
 * Installs development tools and extensions to facilitate debugging
 * and application testing. Only active in development mode.
 */

import { saveLog } from "../../helpers/storage/store";
import {
  installExtension,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";

// Environment detection
const inDevelopment = process.env.NODE_ENV === "development";

/**
 * Installs development tools and extensions
 *
 * @returns {Promise<void>} Resolves when extensions are installed or skipped
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
