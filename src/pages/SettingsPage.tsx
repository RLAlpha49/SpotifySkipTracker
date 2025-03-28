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

import { ApiCredentialsForm } from "@/components/settings/ApiCredentialsForm";
import { ApplicationSettingsForm } from "@/components/settings/ApplicationSettingsForm";
import { ImportExportSettings } from "@/components/settings/ImportExportSettings";
import { ResetSettingsDialog } from "@/components/settings/ResetSettingsDialog";
import { RestartDialog } from "@/components/settings/RestartDialog";
import { settingsFormSchema } from "@/components/settings/settingsFormSchema";
import { SkipDetectionForm } from "@/components/settings/SkipDetectionForm";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { SettingsSchema } from "@/types/settings";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

export default function SettingsPage() {
  // State for application restart confirmation dialog
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  // State for tracking whether settings have been changed
  const [settingsChanged, setSettingsChanged] = useState(false);
  // State for skip progress percentage slider
  const [skipProgress, setSkipProgress] = useState(70);
  // State for storing the complete current settings
  const [currentSettings, setCurrentSettings] = useState<SettingsSchema | null>(
    null,
  );

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
      pollingInterval: currentSettings?.pollingInterval || 1000,
    },
  });

  /**
   * Loads saved settings from storage on component mount
   */
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await window.spotify.getSettings();

        // Store complete settings for import/export
        setCurrentSettings(settings);

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
          pollingInterval: settings.pollingInterval || 1000,
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
  const requiresRestart = (newSettings: SettingsSchema): boolean => {
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
      const currentSettingsData = await window.spotify.getSettings();

      const settings = {
        ...currentSettingsData,
        ...values,
        skipProgress,
        autoUnlike: values.autoUnlike,
      };

      const success = await window.spotify.saveSettings(settings);

      if (success) {
        // Update current settings reference for import/export
        setCurrentSettings(settings);

        toast.success("Settings saved", {
          description: "Your settings have been saved successfully.",
        });

        if (requiresRestart(settings as SettingsSchema)) {
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
   * Handles settings import from file
   *
   * @param importedSettings - The settings loaded from an import file
   */
  const handleImportSettings = async (importedSettings: SettingsSchema) => {
    try {
      // Extract form values from imported settings
      const {
        clientId = "",
        clientSecret = "",
        redirectUri = "http://localhost:8888/callback",
        fileLogLevel = "INFO",
        logLevel = "INFO",
        logLineCount = 1000,
        maxLogFiles = 10,
        logRetentionDays = 30,
        skipThreshold = 3,
        timeframeInDays = 30,
        skipProgress: importedSkipProgress = 70,
        autoStartMonitoring = true,
        autoUnlike = true,
      } = importedSettings;

      // Update form with imported values
      form.reset({
        clientId,
        clientSecret,
        redirectUri,
        fileLogLevel: fileLogLevel || logLevel,
        logLineCount,
        maxLogFiles,
        logRetentionDays,
        skipThreshold,
        timeframeInDays,
        autoStartMonitoring,
        autoUnlike,
        pollingInterval: importedSettings.pollingInterval || 1000,
      });

      // Update other state values
      setSkipProgress(importedSkipProgress);

      // Save the imported settings
      const success = await window.spotify.saveSettings(importedSettings);

      if (success) {
        setCurrentSettings(importedSettings);
        setSettingsChanged(false);

        // Check if restart is needed
        if (requiresRestart(importedSettings as SettingsSchema)) {
          setShowRestartDialog(true);
        }
      } else {
        throw new Error("Failed to save imported settings");
      }
    } catch (error) {
      console.error("Error importing settings:", error);
      toast.error("Import failed", {
        description: "Failed to apply imported settings. Please try again.",
      });
    }
  };

  /**
   * Resets all settings to default values
   */
  const handleResetSettings = async () => {
    try {
      // Get default settings from the main process
      const success = await window.spotify.resetSettings();

      if (success) {
        // Reload settings after reset
        const defaultSettings = await window.spotify.getSettings();

        // Update the form with default values
        form.reset({
          clientId: defaultSettings.clientId || "",
          clientSecret: defaultSettings.clientSecret || "",
          redirectUri:
            defaultSettings.redirectUri || "http://localhost:8888/callback",
          fileLogLevel: defaultSettings.fileLogLevel || "INFO",
          logLineCount: defaultSettings.logLineCount || 1000,
          maxLogFiles: defaultSettings.maxLogFiles || 10,
          logRetentionDays: defaultSettings.logRetentionDays || 30,
          skipThreshold: defaultSettings.skipThreshold || 3,
          timeframeInDays: defaultSettings.timeframeInDays || 30,
          autoStartMonitoring: defaultSettings.autoStartMonitoring ?? true,
          autoUnlike: defaultSettings.autoUnlike ?? true,
          pollingInterval: defaultSettings.pollingInterval || 1000,
        });

        setSkipProgress(defaultSettings.skipProgress || 70);
        setCurrentSettings(defaultSettings);
        setSettingsChanged(false);

        toast.success("Settings reset", {
          description: "All settings have been reset to their default values.",
        });
      } else {
        throw new Error("Failed to reset settings");
      }
    } catch (error) {
      console.error("Error resetting settings:", error);
      toast.error("Reset failed", {
        description: "Failed to reset settings to defaults. Please try again.",
      });
    }
  };

  /**
   * Tracks form changes to enable/disable save button
   */
  useEffect(() => {
    const subscription = form.watch(() => setSettingsChanged(true));
    return () => subscription.unsubscribe();
  }, [form]);

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure application settings and Spotify credentials
        </p>
      </div>

      <CardContent className="p-0 sm:p-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
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

            {/* Import/Export and Reset Settings */}
            {currentSettings && (
              <ImportExportSettings
                currentSettings={currentSettings}
                onImport={handleImportSettings}
              />
            )}

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-between">
              <div className="sm:w-1/3">
                <ResetSettingsDialog onReset={handleResetSettings} />
              </div>

              <div className="flex justify-end sm:w-2/3">
                <Button
                  type="submit"
                  disabled={!settingsChanged}
                  className="w-full px-6 transition-all duration-200 sm:w-auto"
                  size="lg"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>

      {/* Restart Dialog */}
      {showRestartDialog && (
        <RestartDialog
          showRestartDialog={showRestartDialog}
          setShowRestartDialog={setShowRestartDialog}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
