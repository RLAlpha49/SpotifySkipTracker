/**
 * @packageDocumentation
 * @module main
 * @description Spotify Skip Tracker - Application Entry Point
 *
 * This is the entry point for the Electron application.
 * It simply delegates to the modularized main process implementation.
 *
 * This module exists to preserve existing build configurations and paths,
 * while allowing for better internal organization of the main process code.
 *
 * @source
 */

// Forward to the actual main process implementation
import "./electron/main";
