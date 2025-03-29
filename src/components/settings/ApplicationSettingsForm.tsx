/**
 * @packageDocumentation
 * @module ApplicationSettingsForm
 * @description General Application Settings Configuration Component
 *
 * Provides a comprehensive interface for configuring core application
 * behavior, including monitoring, polling frequency, theme selection,
 * and logging parameters. This component controls settings that affect
 * the overall application experience and performance.
 *
 * Features:
 * - Auto-start monitoring toggle for automatic session tracking
 * - Polling interval adjustment for Spotify API request frequency
 * - Logging configuration with level selection and retention policies
 * - Theme selection for light/dark/system preferences
 * - Comprehensive tooltips explaining setting implications
 * - Organized in logical sections with appropriate visual hierarchy
 *
 * This component represents the central configuration panel for general
 * application behavior, affecting system resources, data collection,
 * and user experience aspects of the application.
 */

import ToggleTheme from "@/components/ToggleTheme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Archive,
  CalendarDays,
  FileText,
  Gauge,
  HelpCircle,
  MonitorPlay,
  Settings2,
  Sun,
} from "lucide-react";
import React from "react";
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { settingsFormSchema } from "./settingsFormSchema";

/**
 * Props for the ApplicationSettingsForm component
 *
 * @property form - React Hook Form instance with Zod schema typing
 * @property setSettingsChanged - Callback to notify parent component of changes
 */
interface ApplicationSettingsFormProps {
  form: UseFormReturn<z.infer<typeof settingsFormSchema>>;
  setSettingsChanged: (changed: boolean) => void;
}

/**
 * General application settings configuration form
 *
 * Renders a comprehensive form with controls for core application settings
 * including monitoring behavior, polling frequency, logging options, and
 * theme preferences. Groups related settings into visually distinct sections.
 *
 * The component uses a combination of switches, select dropdowns, number inputs,
 * and specialized controls to provide an intuitive configuration experience.
 * Each setting includes detailed tooltips explaining its purpose and implications.
 *
 * @param props - Component properties
 * @param props.form - React Hook Form instance for form state management
 * @param props.setSettingsChanged - Function to notify parent of form changes
 * @returns React component for managing general application settings
 * @source
 */
export function ApplicationSettingsForm({
  form,
  setSettingsChanged,
}: ApplicationSettingsFormProps) {
  return (
    <div>
      <CardHeader className="px-0 pt-0">
        <CardTitle className="mb-1 flex items-center text-xl font-semibold">
          <Settings2 className="text-primary mr-2 h-5 w-5" />
          Application Settings
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Configure general application behavior
        </p>
      </CardHeader>

      <Card className="border-muted-foreground/20 shadow-sm">
        <CardContent className="space-y-6 p-6">
          <FormField
            control={form.control}
            name="autoStartMonitoring"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <FormLabel className="flex items-center text-base font-medium">
                      <MonitorPlay className="text-primary-muted mr-1.5 h-4 w-4" />
                      Auto-Start Monitoring
                    </FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="text-muted-foreground h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-md">
                          <p>
                            When enabled, the app will automatically begin
                            monitoring your Spotify activity when you launch the
                            app or log in, without requiring you to manually
                            start monitoring.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <FormDescription>
                    Automatically start monitoring when the app launches or when
                    you log in
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
            name="pollingInterval"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <FormLabel className="flex items-center text-base font-medium">
                      <Gauge className="text-primary-muted mr-1.5 h-4 w-4" />
                      Polling Interval (ms)
                    </FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="text-muted-foreground h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-md">
                          <p>
                            Controls how frequently the app checks with Spotify
                            for playback changes. Lower values provide more
                            responsive detection but use more resources. Higher
                            values conserve system resources but may be less
                            responsive. Recommended range: 1000-5000ms.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <FormDescription>
                    Time in milliseconds between Spotify API polling requests
                  </FormDescription>
                </div>
                <FormControl>
                  <Input
                    type="number"
                    min={500}
                    max={10000}
                    className="w-32 text-right"
                    {...field}
                    onChange={(e) => {
                      field.onChange(Number(e.target.value));
                      setSettingsChanged(true);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="flex items-center text-base font-medium">
              <FileText className="text-primary-muted mr-1.5 h-4 w-4" />
              Logging Configuration
            </h3>

            <FormField
              control={form.control}
              name="fileLogLevel"
              render={({ field }) => (
                <FormItem>
                  <div className="mb-1.5 flex items-center space-x-2">
                    <FormLabel className="font-medium">
                      Log File Level
                    </FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="text-muted-foreground h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-md">
                          <p>
                            Controls the level of detail saved in log files.
                            DEBUG includes all events, INFO includes normal
                            operations, WARNING includes potential issues, ERROR
                            includes failures, and CRITICAL includes only
                            critical failures.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSettingsChanged(true);
                    }}
                    value={field.value}
                  >
                    <SelectTrigger className="w-full">
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
                    Controls what logs are saved to log files (display filtering
                    is separate)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="logLineCount"
                render={({ field }) => (
                  <FormItem>
                    <div className="mb-1.5 flex items-center space-x-2">
                      <FormLabel className="flex items-center font-medium">
                        <Archive className="text-primary-muted mr-1.5 h-4 w-4" />
                        Log Line Count
                      </FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="text-muted-foreground h-4 w-4" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-md">
                            <p>
                              The maximum number of log lines to keep in each
                              log file. When this limit is reached, older logs
                              are archived or rotated. Higher values retain more
                              history but use more disk space.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
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

              <FormField
                control={form.control}
                name="maxLogFiles"
                render={({ field }) => (
                  <FormItem>
                    <div className="mb-1.5 flex items-center space-x-2">
                      <FormLabel className="font-medium">
                        Max Log Files
                      </FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="text-muted-foreground h-4 w-4" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-md">
                            <p>
                              The maximum number of archived log files to
                              retain. Older archives beyond this limit will be
                              automatically deleted. This prevents excessive
                              disk usage while preserving some history.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
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

            <FormField
              control={form.control}
              name="logRetentionDays"
              render={({ field }) => (
                <FormItem>
                  <div className="mb-1.5 flex items-center space-x-2">
                    <FormLabel className="flex items-center font-medium">
                      <CalendarDays className="text-primary-muted mr-1.5 h-4 w-4" />
                      Log Retention Days
                    </FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="text-muted-foreground h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-md">
                          <p>
                            The maximum age in days for log files before
                            they&apos;re automatically deleted. This provides an
                            additional time-based cleanup mechanism alongside
                            the max files limit.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
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

          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center space-x-2">
              <Label className="flex items-center text-base font-medium">
                <Sun className="text-primary-muted mr-1.5 h-4 w-4" />
                Theme
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <ToggleTheme />
              <span className="text-muted-foreground text-sm">
                Toggle between light and dark mode
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
