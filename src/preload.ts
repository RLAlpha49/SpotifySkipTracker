/**
 * Preload Script for Electron Application
 *
 * This script executes in a privileged environment with access to both Node.js APIs
 * and limited access to renderer process APIs. It's used to securely expose
 * main process functionality to the renderer process via contextBridge.
 *
 * The exposeContexts function creates the bridge between processes, allowing
 * the React application to communicate with Electron/Node.js features and
 * access system-level functionality in a controlled way.
 */

import exposeContexts from "./helpers/ipc/context-exposer";

// Initialize the IPC bridge between main and renderer processes
exposeContexts();
