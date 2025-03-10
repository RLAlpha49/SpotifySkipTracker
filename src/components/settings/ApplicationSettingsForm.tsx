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
                    <FormLabel className="text-base">
                      Auto-Start Monitoring
                    </FormLabel>
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
  );
} 