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
import { ScrollArea } from "@/components/ui/scroll-area";
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
  logLevel: z.enum(["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]),
  logLineCount: z.coerce.number().int().min(10).max(1000),
  skipThreshold: z.coerce.number().int().min(1).max(10),
  timeframeInDays: z.coerce.number().int().min(1).max(365),
  autoStartMonitoring: z.boolean().default(true),
});

/**
 * Type definition for application settings
 * Includes all validated form fields plus the skipProgress setting
 * which is handled separately with a slider
 */
type SpotifySettings = z.infer<typeof settingsFormSchema> & {
  skipProgress: number;
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
      logLevel: "INFO",
      logLineCount: 100,
      skipThreshold: 3,
      timeframeInDays: 30,
      autoStartMonitoring: true,
    },
  });

  /**
   * Load saved settings from storage when component mounts
   */
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await window.spotify.getSettings();

        // Update form values with loaded settings
        form.reset({
          clientId: settings.clientId || "",
          clientSecret: settings.clientSecret || "",
          redirectUri: settings.redirectUri || "http://localhost:8888/callback",
          logLevel: settings.logLevel || "INFO",
          logLineCount: settings.logLineCount || 100,
          skipThreshold: settings.skipThreshold || 3,
          timeframeInDays: settings.timeframeInDays || 30,
          autoStartMonitoring: settings.autoStartMonitoring ?? true,
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
      // Combine form values with skip progress setting
      const settings: SpotifySettings = {
        ...values,
        skipProgress,
      };

      // Save settings to storage
      const success = await window.spotify.saveSettings(settings);

      if (success) {
        // Show success notification
        toast.success("Settings saved", {
          description: "Your settings have been saved successfully.",
        });

        // Check if restart is required
        if (requiresRestart(settings)) {
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-6 pr-4">
              {/* Spotify API Settings */}
              <div>
                <h2 className="text-lg font-semibold">
                  Spotify API Credentials
                </h2>
                <p className="text-muted-foreground mb-4 text-sm">
                  Enter your Spotify Developer credentials. You can get these
                  from the{" "}
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
                  <CardContent className="space-y-4 p-6">
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
                  </CardContent>
                </Card>
              </div>

              {/* Skip Detection Settings */}
              <div>
                <h2 className="text-lg font-semibold">
                  Skip Detection Settings
                </h2>
                <p className="text-muted-foreground mb-4 text-sm">
                  Configure how skips are detected and when tracks are removed
                </p>

                <Card>
                  <CardContent className="space-y-4 p-6">
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
                    <div className="space-y-2">
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
                      <p className="text-muted-foreground text-xs">
                        If a track is played beyond this percentage, it
                        won&apos;t be considered skipped
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Application Settings */}
              <div>
                <h2 className="text-lg font-semibold">Application Settings</h2>
                <p className="text-muted-foreground mb-4 text-sm">
                  Configure general application behavior
                </p>

                <Card>
                  <CardContent className="space-y-4 p-6">
                    <FormField
                      control={form.control}
                      name="logLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Log Level</FormLabel>
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
                            Controls the verbosity of application logs
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                              max={1000}
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
                    <div className="space-y-2">
                      <Label>Theme</Label>
                      <div className="flex items-center space-x-2">
                        <ToggleTheme />
                        <span className="text-sm">Toggle dark/light mode</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end">
            <Button type="submit" disabled={!settingsChanged}>
              Save Settings
            </Button>
          </div>
        </form>
      </Form>

      {/* Application Restart Dialog */}
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
