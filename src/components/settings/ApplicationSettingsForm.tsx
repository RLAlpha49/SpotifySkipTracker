import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import ToggleTheme from "@/components/ToggleTheme";
import { settingsFormSchema } from "./settingsFormSchema";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface ApplicationSettingsFormProps {
  form: UseFormReturn<z.infer<typeof settingsFormSchema>>;
  setSettingsChanged: (changed: boolean) => void;
}

export function ApplicationSettingsForm({
  form,
  setSettingsChanged,
}: ApplicationSettingsFormProps) {
  return (
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
                    <div className="flex items-center space-x-1">
                      <FormLabel className="text-base">
                        Auto-Start Monitoring
                      </FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="text-muted-foreground h-4 w-4" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              When enabled, the app will automatically begin
                              monitoring your Spotify activity when you launch
                              the app or log in, without requiring you to
                              manually start monitoring.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <FormDescription>
                      Automatically start monitoring when the app launches or
                      when you log in
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
                  <div className="flex items-center space-x-1">
                    <FormLabel>Log File Level</FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="text-muted-foreground h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>
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
                    Controls what logs are saved to log files (display filtering
                    is separate)
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
                  <div className="flex items-center space-x-1">
                    <FormLabel>Log Line Count</FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="text-muted-foreground h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            The maximum number of log lines to keep in each log
                            file. When this limit is reached, older logs are
                            archived or rotated. Higher values retain more
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
          </div>

          <div className="mb-4">
            <FormField
              control={form.control}
              name="maxLogFiles"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-1">
                    <FormLabel>Max Log Files</FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="text-muted-foreground h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            The maximum number of archived log files to retain.
                            Older archives beyond this limit will be
                            automatically deleted. This prevents excessive disk
                            usage while preserving some history.
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

          <div className="mb-4">
            <FormField
              control={form.control}
              name="logRetentionDays"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-1">
                    <FormLabel>Log Retention Days</FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="text-muted-foreground h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>
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
  );
}
