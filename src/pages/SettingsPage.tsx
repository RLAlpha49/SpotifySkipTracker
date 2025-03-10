/**
 * SettingsPage Component
 *
 * Configuration interface for application settings:
 * - Spotify API authentication credentials
 * - Skip detection parameters and thresholds
 * - Log management and retention policies
 * - Application behavior and automation preferences
 *
 * Uses Zod schema validation to ensure data integrity before
 * persisting settings to storage.
 */

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { SpotifySettings } from "@/types/spotify";
import { ApiCredentialsForm } from "@/components/settings/ApiCredentialsForm";
import { SkipDetectionForm } from "@/components/settings/SkipDetectionForm";
import { ApplicationSettingsForm } from "@/components/settings/ApplicationSettingsForm";
import { RestartDialog } from "@/components/settings/RestartDialog";
import { settingsFormSchema } from "@/components/settings/settingsFormSchema";

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
   * Loads saved settings from storage on component mount
   */
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await window.spotify.getSettings();

        // Handle legacy settings format
        const fileLogLevel =
          settings.fileLogLevel || settings.logLevel || "INFO";

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

        setSkipProgress(settings.skipProgress || 70);
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
   * Determines if settings changes require application restart
   *
   * @param newSettings - The modified settings to evaluate
   * @returns Boolean indicating if restart is needed
   */
  const requiresRestart = (newSettings: SpotifySettings): boolean => {
    const currentValues = form.getValues();

    return (
      currentValues.clientId !== newSettings.clientId ||
      currentValues.clientSecret !== newSettings.clientSecret ||
      currentValues.redirectUri !== newSettings.redirectUri
    );
  };

  /**
   * Initiates application restart process
   */
  const handleRestart = async () => {
    try {
      setShowRestartDialog(false);

      toast.info("Restarting application...", {
        description: "The application will restart now to apply changes.",
      });

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
   * Form submission handler - persists settings and manages restart process
   *
   * @param values - Form values from React Hook Form submission
   */
  async function onSubmit(values: z.infer<typeof settingsFormSchema>) {
    try {
      const currentSettings = await window.spotify.getSettings();

      const settings = {
        ...currentSettings,
        ...values,
        skipProgress,
        autoUnlike: values.autoUnlike,
      };

      const success = await window.spotify.saveSettings(settings);

      if (success) {
        toast.success("Settings saved", {
          description: "Your settings have been saved successfully.",
        });

        if (requiresRestart(settings as SpotifySettings)) {
          setShowRestartDialog(true);
        }

        setSettingsChanged(false);
      } else {
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
   * Tracks form changes to enable/disable save button
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
            <ApiCredentialsForm
              form={form}
              setSettingsChanged={setSettingsChanged}
            />

            {/* Skip Detection Settings */}
            <SkipDetectionForm
              form={form}
              skipProgress={skipProgress}
              setSkipProgress={setSkipProgress}
              setSettingsChanged={setSettingsChanged}
            />

            {/* Application Settings */}
            <ApplicationSettingsForm
              form={form}
              setSettingsChanged={setSettingsChanged}
            />

            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={!settingsChanged}>
                Save Settings
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>

      {/* Restart Dialog */}
      <RestartDialog
        showRestartDialog={showRestartDialog}
        setShowRestartDialog={setShowRestartDialog}
        onRestart={handleRestart}
      />
    </div>
  );
}
