/**
 * @packageDocumentation
 * @module settings-store
 * @description Application Settings Management System
 *
 * Provides persistence and retrieval of user preferences and application
 * configuration with smart defaults and validation handling.
 *
 * Features:
 * - Type-safe settings schema with TypeScript interfaces
 * - Default values for first-time application use
 * - Persistent storage across application restarts
 * - Settings reset capability for troubleshooting
 * - Validation of loaded settings against defaults
 *
 * Settings include critical configuration parameters:
 * - Spotify API credentials and authentication endpoints
 * - Logging verbosity and retention policies
 * - Skip detection thresholds and metrics
 * - Data filtering and display timeframes
 * - Monitoring behavior and performance settings
 */

import { SettingsSchema } from "@/types/settings";
import fs from "fs";
import path from "path";
import { settingsFilePath } from "./utils";

// Default settings configuration
const defaultSettings: SettingsSchema = {
  clientId: "",
  clientSecret: "",
  redirectUri: "http://localhost:8888/callback",
  logLevel: "INFO",
  logLineCount: 100,
  skipThreshold: 3,
  timeframeInDays: 30,
  skipProgress: 70,
  autoStartMonitoring: true,
  pollingInterval: 1000,
};

/**
 * Persists application settings to disk
 *
 * @param settings - Application settings to save
 * @returns Boolean indicating success or failure
 * @source
 */
export function saveSettings(settings: SettingsSchema): boolean {
  try {
    // Create settings directory if needed
    if (!fs.existsSync(path.dirname(settingsFilePath))) {
      fs.mkdirSync(path.dirname(settingsFilePath), { recursive: true });
    }

    fs.writeFileSync(
      settingsFilePath,
      JSON.stringify(settings, null, 2),
      "utf-8",
    );
    console.log("Settings saved successfully to:", settingsFilePath);
    return true;
  } catch (error) {
    console.error("Failed to save settings:", error);
    return false;
  }
}

/**
 * Retrieves application settings from disk
 *
 * @returns Current application settings or defaults if not found
 * @source
 */
export function getSettings(): SettingsSchema {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const fileContent = fs.readFileSync(settingsFilePath, "utf-8");
      const settings = JSON.parse(fileContent) as SettingsSchema;
      return { ...defaultSettings, ...settings };
    }
  } catch (error) {
    console.error("Error reading settings file:", error);
  }

  return defaultSettings;
}

/**
 * Resets all settings to their default values
 *
 * @returns Boolean indicating success or failure
 * @source
 */
export function resetSettings(): boolean {
  try {
    // Check if settings file exists
    if (fs.existsSync(settingsFilePath)) {
      // Save default settings to disk
      return saveSettings(defaultSettings);
    }
    return true; // If no settings file exists, consider it a success
  } catch (error) {
    console.error("Failed to reset settings:", error);
    return false;
  }
}
