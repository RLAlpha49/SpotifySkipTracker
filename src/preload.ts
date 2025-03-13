/**
 * Electron Preload Script
 *
 * Executes in Electron's privileged context with access to both Node.js and limited
 * renderer process APIs. Establishes a secure bridge between main and renderer processes
 * via the contextBridge API.
 *
 * Primary responsibilities:
 * - Expose IPC channels to renderer process through a controlled interface
 * - Maintain security by preventing direct access to Node.js from the renderer
 * - Provide type-safe communication between processes
 */

import exposeContexts from "./helpers/ipc/context-exposer";

// Initialize the IPC bridge between main and renderer processes
exposeContexts();
