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
import { Separator } from "@/components/ui/separator";
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

// Define schema for settings form
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
});

// Type for application settings
type SpotifySettings = z.infer<typeof settingsFormSchema> & {
  skipProgress: number;
};

export default function SettingsPage() {
  const [skipProgressValue, setSkipProgressValue] = useState<number>(70);
  const [originalSettings, setOriginalSettings] =
    useState<SpotifySettings | null>(null);
  const [showRestartDialog, setShowRestartDialog] = useState(false);

  // Initialize form with default values
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
    },
  });

  // Load saved settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Get settings from persistent storage
        const savedSettings = await window.spotify.getSettings();

        // Store original settings for comparison
        setOriginalSettings(savedSettings);

        // Update form with saved settings
        form.reset({
          clientId: savedSettings.clientId,
          clientSecret: savedSettings.clientSecret,
          redirectUri: savedSettings.redirectUri,
          logLevel: savedSettings.logLevel,
          logLineCount: savedSettings.logLineCount,
          skipThreshold: savedSettings.skipThreshold,
          timeframeInDays: savedSettings.timeframeInDays,
        });

        // Update skip progress value
        setSkipProgressValue(savedSettings.skipProgress);
      } catch (error) {
        console.error("Failed to load settings:", error);
        toast.error("Failed to load settings", {
          description: "Could not load saved settings. Using defaults.",
        });
      }
    };

    loadSettings();
  }, [form]);

  // Check if critical settings that require restart have changed
  const requiresRestart = (newSettings: SpotifySettings): boolean => {
    if (!originalSettings) return false;

    // These settings require a restart to take effect
    const criticalSettings = [
      "clientId",
      "clientSecret",
      "redirectUri",
      "logLevel",
    ] as const;

    return criticalSettings.some(
      (setting) => originalSettings[setting] !== newSettings[setting],
    );
  };

  // Handle restart application
  const handleRestart = async () => {
    try {
      // Tell the main process to restart the app
      await window.spotify.restartApp();
    } catch (error) {
      console.error("Failed to restart app:", error);
      toast.error("Restart Failed", {
        description: "Please close and reopen the application manually.",
      });
    }
  };

  // Handle form submission
  async function onSubmit(values: z.infer<typeof settingsFormSchema>) {
    try {
      // Show processing toast
      toast.loading("Saving settings...");

      const newSettings: SpotifySettings = {
        ...values,
        skipProgress: skipProgressValue,
      };

      // Log settings changes
      await window.spotify.saveLog(`Updating settings - log level: ${newSettings.logLevel}, skip threshold: ${newSettings.skipThreshold}`, "DEBUG");

      // Save settings to persistent storage
      const success = await window.spotify.saveSettings(newSettings);

      if (success) {
        // Dismiss loading toast and show success toast
        toast.dismiss();
        toast.success("Settings saved successfully");

        // Log settings saved
        await window.spotify.saveLog("Settings updated successfully", "DEBUG");

        // Store the new settings as original settings
        setOriginalSettings(newSettings);

        // Check if restart is needed
        if (requiresRestart(newSettings)) {
          await window.spotify.saveLog("Settings change requires application restart", "WARNING");
          setShowRestartDialog(true);
        }
      } else {
        // Dismiss loading toast and show error toast
        toast.dismiss();
        toast.error("Failed to save settings");
        
        // Log error
        await window.spotify.saveLog("Failed to save settings", "ERROR");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      // Dismiss loading toast and show error toast
      toast.dismiss();
      toast.error("Error", {
        description:
          "An unexpected error occurred while saving settings. Please check the console for details.",
        duration: 4000,
      });
    }
  }

  return (
    <>
      <div className="flex h-full flex-col p-4">
        <div className="mb-4">
          <h1 className="font-mono text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm uppercase">
            Configure application settings
          </p>
        </div>

        <Card className="flex flex-1 flex-col">
          <CardContent className="flex flex-1 flex-col p-6">
            <ScrollArea className="flex-1 pr-4">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-8"
                >
                  {/* Spotify API section */}
                  <div>
                    <h3 className="text-lg font-medium">
                      Spotify API Settings
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Configure your Spotify API credentials
                    </p>
                    <Separator className="my-4" />

                    <div className="space-y-4">
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
                              />
                            </FormControl>
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
                              />
                            </FormControl>
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
                              />
                            </FormControl>
                            <FormDescription>
                              This should match what you have configured in your
                              Spotify Developer Dashboard
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Log settings section */}
                  <div>
                    <h3 className="text-lg font-medium">Log Settings</h3>
                    <Separator className="my-4" />

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="logLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Log Level</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select log level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="DEBUG">DEBUG</SelectItem>
                                <SelectItem value="INFO">INFO</SelectItem>
                                <SelectItem value="WARNING">WARNING</SelectItem>
                                <SelectItem value="ERROR">ERROR</SelectItem>
                                <SelectItem value="CRITICAL">
                                  CRITICAL
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Controls which log messages are displayed (DEBUG shows all, CRITICAL shows only critical messages)
                            </FormDescription>
                            <FormMessage />
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
                              />
                            </FormControl>
                            <FormDescription>
                              Maximum number of log lines to display
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Skip settings section */}
                  <div>
                    <h3 className="text-lg font-medium">Skip Settings</h3>
                    <Separator className="my-4" />

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="skipThreshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Skip Threshold</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={10}
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Number of skips before a track is considered for
                              unliking
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
                            <FormLabel>Timeframe (Days)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={365}
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Only consider skips within this timeframe
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-2">
                        <Label>Skip Progress: {skipProgressValue}%</Label>
                        <Slider
                          value={[skipProgressValue]}
                          onValueChange={(value) =>
                            setSkipProgressValue(value[0])
                          }
                          min={0}
                          max={100}
                          step={1}
                        />
                        <p className="text-muted-foreground text-xs">
                          Progress threshold for counting a skip (percentage of
                          track duration)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Theme settings section */}
                  <div>
                    <h3 className="text-lg font-medium">Appearance Settings</h3>
                    <Separator className="my-4" />

                    <div className="flex items-center space-x-2">
                      <Label>Theme</Label>
                      <ToggleTheme />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit">Save Settings</Button>
                  </div>
                </form>
              </Form>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Restart Dialog */}
      <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart Required</AlertDialogTitle>
            <AlertDialogDescription>
              Some of the settings you changed require the application to
              restart in order to take effect. Would you like to restart now?
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
    </>
  );
}
