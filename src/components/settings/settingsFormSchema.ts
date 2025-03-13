import * as z from "zod";

/**
 * Form validation schema
 * Defines constraints and validation rules for all configurable settings
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
});
