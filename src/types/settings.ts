/**
 * Settings-related type definitions
 */

import { LogLevel } from "./logging";

/**
 * Application settings schema interface
 */
export interface SettingsSchema {
  // Spotify API credentials
  clientId: string;
  clientSecret: string;
  redirectUri: string;

  // Log settings
  logLevel: LogLevel;
  fileLogLevel?: LogLevel;
  logLineCount: number;
  maxLogFiles?: number;
  logRetentionDays?: number;

  // Skip detection settings
  skipThreshold: number;
  timeframeInDays: number;
  skipProgress: number;

  // Application behavior
  autoStartMonitoring: boolean;
  autoUnlike?: boolean;

  // UI settings
  displayLogLevel?: LogLevel;
  logAutoRefresh?: boolean;
}
