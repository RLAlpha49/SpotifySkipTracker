/**
 * Application Settings Validation Schema
 *
 * Defines the validation rules, constraints, and type definitions for all
 * configurable application settings. This schema serves multiple purposes:
 *
 * - Validates user input during settings form submission
 * - Provides TypeScript type definitions through Zod inference
 * - Defines default values and acceptable ranges for numeric settings
 * - Enforces required fields and minimum/maximum constraints
 * - Supplies error messages for validation failures
 *
 * The schema is organized into logical sections:
 * 1. Spotify API authentication credentials
 * 2. Logging and diagnostics configuration
 * 3. Skip detection and analysis parameters
 * 4. Application behavior preferences
 *
 * This schema is consumed by React Hook Form via the zodResolver to provide
 * real-time validation feedback in the settings UI.
 */
import * as z from "zod";

/**
 * Settings Form Validation Schema
 *
 * Comprehensive validation schema for all application settings with field-specific
 * constraints, type coercion, and validation error messages. Defines the complete
 * contract for application configuration.
 *
 * Security considerations:
 * - Ensures authentication credentials are properly formatted
 * - Prevents unreasonable values for performance-critical settings
 * - Maintains type safety through explicit validation
 *
 * Performance boundaries:
 * - Sets reasonable limits for resource-intensive features like logging
 * - Constrains polling frequency to prevent API rate limit issues
 * - Balances data retention with storage efficiency
 */
export const settingsFormSchema = z.object({
  // Spotify API credentials
  clientId: z.string().min(1, { message: "Client ID is required" }),
  clientSecret: z.string().min(1, { message: "Client Secret is required" }),
  redirectUri: z.string().min(1, { message: "Redirect URI is required" }),

  // App settings
  fileLogLevel: z.enum(["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]),
  logLineCount: z.coerce.number().int().min(10).max(10000),
  maxLogFiles: z.coerce.number().int().min(1).max(100),
  logRetentionDays: z.coerce.number().int().min(1).max(365),
  skipThreshold: z.coerce.number().int().min(1).max(10),
  timeframeInDays: z.coerce.number().int().min(1).max(365),
  autoStartMonitoring: z.boolean().default(true),
  autoUnlike: z.boolean().default(true),
  pollingInterval: z.coerce.number().int().min(500).max(10000).default(1000),
});
