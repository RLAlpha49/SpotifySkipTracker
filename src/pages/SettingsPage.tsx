/**
 * Settings Page
 *
 * This page provides a form for configuring the application's settings,
 * including:
 * - Spotify API credentials (Client ID, Client Secret, Redirect URI)
 * - Skip detection settings (threshold, timeframe, progress percentage)
 * - Application settings (log level, log line count)
 * - Theme preferences
 *
 * The form uses React Hook Form with Zod validation to ensure
 * all settings are valid before being saved.
 */

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import ToggleTheme from "@/components/ToggleTheme";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";

/**
 * Zod schema for validating settings form inputs
 * Defines validation rules for all form fields
 */
const settingsFormSchema = z.object({
  // Spotify API credentials
  clientId: z.string().min(1, { message: "Client ID is required" }),
  clientSecret: z.string().min(1, { message: "Client Secret is required" }),
  redirectUri: z.string().min(1, { message: "Redirect URI is required" }),

  // App settings
  fileLogLevel: z.enum(["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]), // Controls what gets saved to log files
  logLineCount: z.coerce.number().int().min(10).max(10000),
  maxLogFiles: z.coerce.number().int().min(1).max(100),
  logRetentionDays: z.coerce.number().int().min(1).max(365),
  skipThreshold: z.coerce.number().int().min(1).max(10),
  timeframeInDays: z.coerce.number().int().min(1).max(365),
  autoStartMonitoring: z.boolean().default(true),
  autoUnlike: z.boolean().default(true),
});

/**
 * Type definition for application settings
 * Includes all validated form fields plus the skipProgress setting
 * which is handled separately with a slider
 */
export type SpotifySettings = {
  // Spotify API credentials
  clientId: string;
  clientSecret: string;
  redirectUri: string;

  // App settings
  fileLogLevel: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  logLineCount: number;
  maxLogFiles: number;
  logRetentionDays: number;
  skipThreshold: number;
  timeframeInDays: number;
  skipProgress: number;
  autoStartMonitoring: boolean;
  autoUnlike: boolean;

  // Home page settings
  displayLogLevel?: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  logAutoRefresh?: boolean;

  // Support legacy format
  logLevel?: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";
};

export default function SettingsPage() {
  // State for application restart confirmation dialog
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  // State for tracking whether settings have been changed
  const [settingsChanged, setSettingsChanged] = useState(false);
  // State for skip progress percentage slider
  const [skipProgress, setSkipProgress] = useState(70);

  /**
   * Initialize form with React Hook Form and Zod validation
   */
  const form = useForm<z.infer<typeof settingsFormSchema>>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      clientId: "",
      clientSecret: "",
      redirectUri: "http://localhost:8888/callback",
      fileLogLevel: "INFO",
      logLineCount: 1000,
      maxLogFiles: 10,
      logRetentionDays: 30,
      skipThreshold: 3,
      timeframeInDays: 30,
      autoStartMonitoring: true,
      autoUnlike: true,
    },
  });

  /**
   * Load saved settings from storage when component mounts
   */
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await window.spotify.getSettings();

        // Map logLevel to fileLogLevel if old format settings exist
        const fileLogLevel =
          settings.fileLogLevel || settings.logLevel || "INFO";

        // Update form values with loaded settings
        form.reset({
          clientId: settings.clientId || "",
          clientSecret: settings.clientSecret || "",
          redirectUri: settings.redirectUri || "http://localhost:8888/callback",
          fileLogLevel: fileLogLevel,
          logLineCount: settings.logLineCount || 1000,
          maxLogFiles: settings.maxLogFiles || 10,
          logRetentionDays: settings.logRetentionDays || 30,
          skipThreshold: settings.skipThreshold || 5,
          timeframeInDays: settings.timeframeInDays || 30,
          autoStartMonitoring: settings.autoStartMonitoring ?? true,
          autoUnlike: settings.autoUnlike ?? true,
        });

        // Update the skip progress slider
        setSkipProgress(settings.skipProgress || 70);

        // Reset the settings changed flag
        setSettingsChanged(false);
      } catch (error) {
        console.error("Failed to load settings:", error);
        toast.error("Failed to load settings", {
          description: "Could not load saved settings. Using defaults.",
        });
      }
    };

    loadSettings();
  }, [form]);

  /**
   * Check if the new settings require an application restart
   *
   * @param newSettings - The new settings to be saved
   * @returns True if restart is required, false otherwise
   */
  const requiresRestart = (newSettings: SpotifySettings): boolean => {
    const currentValues = form.getValues();

    // Only certain settings changes require a restart
    return (
      currentValues.clientId !== newSettings.clientId ||
      currentValues.clientSecret !== newSettings.clientSecret ||
      currentValues.redirectUri !== newSettings.redirectUri
    );
  };

  /**
   * Handle application restart
   * Calls the restart API and shows a toast notification
   */
  const handleRestart = async () => {
    try {
      // Close the restart dialog
      setShowRestartDialog(false);

      // Show restart notification
      toast.info("Restarting application...", {
        description: "The application will restart now to apply changes.",
      });

      // Trigger application restart
      await window.spotify.restartApp();
    } catch (error) {
      console.error("Failed to restart application:", error);
      toast.error("Failed to restart", {
        description:
          "Could not restart the application. Please restart manually.",
      });
    }
  };

  /**
   * Form submission handler
   * Saves settings and shows restart dialog if needed
   *
   * @param values - Form values from React Hook Form
   */
  async function onSubmit(values: z.infer<typeof settingsFormSchema>) {
    try {
      // Get current settings to preserve any home page settings
      const currentSettings = await window.spotify.getSettings();

      // Combine form values with skip progress setting and any existing settings
      const settings = {
        ...currentSettings,
        ...values,
        skipProgress,
        autoUnlike: values.autoUnlike,
      };

      // Save settings to storage
      const success = await window.spotify.saveSettings(settings);

      if (success) {
        // Show success notification
        toast.success("Settings saved", {
          description: "Your settings have been saved successfully.",
        });

        // Check if restart is required
        if (requiresRestart(settings as SpotifySettings)) {
          setShowRestartDialog(true);
        }

        // Reset settings changed flag
        setSettingsChanged(false);
      } else {
        // Show error notification
        toast.error("Failed to save settings", {
          description: "Could not save settings. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Error", {
        description: "An error occurred while saving settings.",
      });
    }
  }

  /**
   * Track form changes to enable/disable save button
   */
  useEffect(() => {
    const subscription = form.watch(() => setSettingsChanged(true));
    return () => subscription.unsubscribe();
  }, [form]);

  return (
    <div className="container mx-auto py-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure application settings and Spotify credentials
        </p>
      </div>

      <CardContent className="p-2 sm:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Spotify API Settings */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Spotify API Credentials</h2>
              <p className="text-muted-foreground mb-4 text-sm">
                Enter your Spotify Developer credentials. You can get these from
                the{" "}
                <a
                  href="https://developer.spotify.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Spotify Developer Dashboard
                </a>
                .
              </p>
              <Card>
                <CardContent className="p-6">
                  <div className="mb-4">
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client ID</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Spotify Client ID"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                setSettingsChanged(true);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Your Spotify application Client ID
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="mb-4">
                    <FormField
                      control={form.control}
                      name="clientSecret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Secret</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Spotify Client Secret"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                setSettingsChanged(true);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Your Spotify application Client Secret
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <FormField
                      control={form.control}
                      name="redirectUri"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Redirect URI</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="http://localhost:8888/callback"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                setSettingsChanged(true);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            The redirect URI registered in your Spotify
                            application
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Skip Detection Settings */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Skip Detection Settings</h2>
              <p className="text-muted-foreground mb-4 text-sm">
                Configure how skips are detected and when tracks are removed
              </p>

              <Card>
                <CardContent className="p-6">
                  <div className="mb-4">
                    <FormField
                      control={form.control}
                      name="skipThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Skip Count Threshold</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                setSettingsChanged(true);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Number of skips before a track is suggested for
                            removal
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="mb-4">
                    <FormField
                      control={form.control}
                      name="timeframeInDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Analysis Timeframe (days)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={365}
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                setSettingsChanged(true);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Period of time to consider for skip analysis
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <div className="mb-2">
                      <Label htmlFor="skipProgress">
                        Skip Progress Threshold: {skipProgress}%
                      </Label>
                      <Slider
                        id="skipProgress"
                        min={10}
                        max={90}
                        step={5}
                        value={[skipProgress]}
                        onValueChange={(value) => {
                          setSkipProgress(value[0]);
                          setSettingsChanged(true);
                        }}
                      />
                    </div>
                    <p className="text-muted-foreground text-xs">
                      If a track is played beyond this percentage, it won&apos;t
                      be considered skipped
                    </p>
                  </div>

                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name="autoUnlike"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Auto-Remove Skipped Tracks
                            </FormLabel>
                            <FormDescription>
                              Automatically remove tracks from your library when
                              they exceed the skip threshold
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                setSettingsChanged(true);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Application Settings */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Application Settings</h2>
              <p className="text-muted-foreground mb-4 text-sm">
                Configure general application behavior
              </p>

              <Card>
                <CardContent className="p-6">
                  <div className="mb-4">
                    <FormField
                      control={form.control}
                      name="autoStartMonitoring"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Auto-Start Monitoring
                            </FormLabel>
                            <FormDescription>
                              Automatically start monitoring when the app
                              launches or when you log in
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                setSettingsChanged(true);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="mb-4">
                    <FormField
                      control={form.control}
                      name="fileLogLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Log File Level</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSettingsChanged(true);
                            }}
                            value={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select log level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DEBUG">Debug</SelectItem>
                              <SelectItem value="INFO">Info</SelectItem>
                              <SelectItem value="WARNING">Warning</SelectItem>
                              <SelectItem value="ERROR">Error</SelectItem>
                              <SelectItem value="CRITICAL">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Controls what logs are saved to log files (display
                            filtering is separate)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="mb-4">
                    <FormField
                      control={form.control}
                      name="logLineCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Log Line Count</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={10}
                              max={10000}
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                setSettingsChanged(true);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Maximum number of log lines to keep
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="mb-4">
                    <FormField
                      control={form.control}
                      name="maxLogFiles"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Log Files</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                setSettingsChanged(true);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Maximum number of log files to keep
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="mb-4">
                    <FormField
                      control={form.control}
                      name="logRetentionDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Log Retention Days</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={365}
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                setSettingsChanged(true);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Number of days to retain log files
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <Label>Theme</Label>
                    <div className="mt-2 flex items-center space-x-2">
                      <ToggleTheme />
                      <span className="text-sm">Toggle dark/light mode</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={!settingsChanged}>
                Save Settings
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>

      <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart Required</AlertDialogTitle>
            <AlertDialogDescription>
              The changes you made require an application restart to take
              effect. Do you want to restart now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Later</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestart}>
              Restart Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
