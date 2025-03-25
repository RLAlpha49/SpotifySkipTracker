/**
 * Settings storage module
 *
 * Handles saving and retrieving application settings.
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
};

/**
 * Persists application settings to disk
 *
 * @param settings - Application settings to save
 * @returns Boolean indicating success or failure
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
