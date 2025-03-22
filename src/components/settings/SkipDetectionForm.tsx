import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  HelpCircle,
  SkipForward,
  Calendar,
  Percent,
  Trash2,
} from "lucide-react";

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
    <div>
      <CardHeader className="px-0 pt-0">
        <CardTitle className="mb-1 flex items-center text-xl font-semibold">
          <SkipForward className="text-primary mr-2 h-5 w-5" />
          Skip Detection Settings
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Configure how skips are detected and when tracks are removed
        </p>
      </CardHeader>

      <Card className="border-muted-foreground/20 shadow-sm">
        <CardContent className="space-y-6 p-6">
          <FormField
            control={form.control}
            name="skipThreshold"
            render={({ field }) => (
              <FormItem>
                <div className="mb-1.5 flex items-center space-x-2">
                  <FormLabel className="flex items-center text-base font-medium">
                    <SkipForward className="text-primary-muted mr-1.5 h-4 w-4" />
                    Skip Count Threshold
                  </FormLabel>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="text-muted-foreground h-4 w-4" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-md">
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

          <FormField
            control={form.control}
            name="timeframeInDays"
            render={({ field }) => (
              <FormItem>
                <div className="mb-1.5 flex items-center space-x-2">
                  <FormLabel className="flex items-center text-base font-medium">
                    <Calendar className="text-primary-muted mr-1.5 h-4 w-4" />
                    Analysis Timeframe (days)
                  </FormLabel>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="text-muted-foreground h-4 w-4" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-md">
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

          <div className="rounded-lg border p-4">
            <div className="mb-3">
              <div className="mb-1.5 flex items-center space-x-2">
                <Label
                  htmlFor="skipProgress"
                  className="flex items-center text-base font-medium"
                >
                  <Percent className="text-primary-muted mr-1.5 h-4 w-4" />
                  Skip Progress Threshold: {skipProgress}%
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="text-muted-foreground h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-md">
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
                className="mt-2"
              />
            </div>
            <p className="text-muted-foreground text-xs">
              If a track is played beyond this percentage, it won&apos;t be
              considered skipped
            </p>
          </div>

          <FormField
            control={form.control}
            name="autoUnlike"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <FormLabel className="flex items-center text-base font-medium">
                      <Trash2 className="text-primary-muted mr-1.5 h-4 w-4" />
                      Auto-Remove Skipped Tracks
                    </FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="text-muted-foreground h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-md">
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
        </CardContent>
      </Card>
    </div>
  );
}
