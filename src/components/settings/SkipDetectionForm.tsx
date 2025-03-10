import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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
import { settingsFormSchema } from "./settingsFormSchema";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface SkipDetectionFormProps {
  form: UseFormReturn<z.infer<typeof settingsFormSchema>>;
  skipProgress: number;
  setSkipProgress: (value: number) => void;
  setSettingsChanged: (changed: boolean) => void;
}

export function SkipDetectionForm({
  form,
  skipProgress,
  setSkipProgress,
  setSettingsChanged,
}: SkipDetectionFormProps) {
  return (
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
                  <div className="flex items-center space-x-1">
                    <FormLabel>Skip Count Threshold</FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="text-muted-foreground h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            When a track is skipped this many times, it will be
                            suggested for removal. A higher number means tracks
                            need to be skipped more before being flagged.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
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
                    Number of skips before a track is suggested for removal
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
                  <div className="flex items-center space-x-1">
                    <FormLabel>Analysis Timeframe (days)</FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="text-muted-foreground h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Only skips within this many days are counted toward
                            the threshold. A smaller timeframe focuses on recent
                            behavior, while a larger one considers historical
                            patterns.
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
                    Period of time to consider for skip analysis
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div>
            <div className="mb-2">
              <div className="flex items-center space-x-1">
                <Label htmlFor="skipProgress">
                  Skip Progress Threshold: {skipProgress}%
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="text-muted-foreground h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        If you listen to more than this percentage of a track
                        before switching, it won&apos;t count as a skip.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
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
              If a track is played beyond this percentage, it won&apos;t be
              considered skipped
            </p>
          </div>

          <div className="mt-4">
            <FormField
              control={form.control}
              name="autoUnlike"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1">
                      <FormLabel className="text-base">
                        Auto-Remove Skipped Tracks
                      </FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="text-muted-foreground h-4 w-4" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              When enabled, tracks exceeding the skip threshold
                              will automatically be removed from your library
                              without requiring manual confirmation.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <FormDescription>
                      Automatically remove tracks from your library when they
                      exceed the skip threshold
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
  );
}
