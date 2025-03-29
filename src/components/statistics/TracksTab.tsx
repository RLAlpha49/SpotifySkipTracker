/**
 * @packageDocumentation
 * @module TracksTab
 * @description Track Statistics Analysis Component
 *
 * Provides detailed visualization and analysis of track-level listening statistics,
 * focusing on play counts, completion rates, and skip patterns. This component
 * offers users insights into their most-played tracks and listening behaviors.
 *
 * Features:
 * - Most played tracks with completion percentage visualization
 * - Toggle between list and bar chart visualization modes
 * - Skip rate analysis for frequently skipped tracks
 * - Play count metrics with artist attribution
 * - Completion percentage with color-coded indicators
 * - Loading skeleton state during data retrieval
 * - Empty state handling for new users
 *
 * This component helps users understand their track-specific listening patterns,
 * including which tracks they listen to most frequently and which they tend
 * to skip or listen to partially.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { StatisticsData } from "@/types/statistics";
import {
  BarChart,
  BarChart3,
  Check,
  Clock,
  Disc,
  List,
  PlayCircle,
  Repeat,
  SkipForward,
} from "lucide-react";
import React, { useState } from "react";
import {
  Bar,
  CartesianGrid,
  BarChart as RechartsBarChart,
  XAxis,
  YAxis,
} from "recharts";
import { NoDataMessage } from "./NoDataMessage";
import { formatPercent } from "./utils";

/**
 * Props for the TracksTab component
 *
 * @property loading - Whether statistics data is currently being loaded
 * @property statistics - Raw statistics data object or null if unavailable
 */
interface TracksTabProps {
  loading: boolean;
  statistics: StatisticsData | null;
}

/**
 * Track listening statistics analysis component
 *
 * Renders visualizations of track-level listening data, including most played
 * tracks, completion rates, and skip patterns. Supports both list and chart
 * visualization modes for different analysis perspectives.
 *
 * The component handles three main states:
 * - Loading state with skeleton placeholders
 * - Empty state with guidance for new users
 * - Populated state with track statistics visualizations
 *
 * @param props - Component properties
 * @param props.loading - Whether data is being loaded
 * @param props.statistics - Complete statistics data object
 * @returns React component with track statistics visualizations
 * @source
 */
export function TracksTab({ loading, statistics }: TracksTabProps) {
  // Add state for chart types
  const [mostPlayedChartType, setMostPlayedChartType] = useState<
    "list" | "bar"
  >("list");

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/40 overflow-hidden transition-all duration-200 md:col-span-2">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-2 w-full flex-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 overflow-hidden transition-all duration-200">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-3 w-48" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 overflow-hidden transition-all duration-200">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-3 w-48" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (
    !statistics ||
    !statistics.trackMetrics ||
    Object.keys(statistics.trackMetrics).length === 0
  ) {
    return (
      <NoDataMessage message="No track data available yet. Keep listening to music to generate insights!" />
    );
  }

  /**
   * Determines progress bar color based on track completion percentage
   *
   * Maps completion percentage to appropriate colors to provide visual feedback:
   * - High values (> 90%): Green for complete listening
   * - Medium values (70-90%): Amber for substantial listening
   * - Lower values (< 70%): Primary theme color for partial listening
   *
   * @param completion - Track completion percentage (0-100)
   * @returns CSS class string for the progress bar color
   */
  const getCompletionColor = (completion: number) => {
    if (completion > 90) return "bg-emerald-500";
    if (completion > 70) return "bg-amber-500";
    return "bg-primary";
  };

  /**
   * Determines text color based on track skip rate
   *
   * Maps skip rate values to appropriate colors to provide visual feedback:
   * - Low values (< 20%): Green for rarely skipped tracks
   * - Medium values (20-50%): Amber for occasionally skipped tracks
   * - High values (> 50%): Red for frequently skipped tracks
   *
   * @param skipRate - Skip rate as a decimal (0-1)
   * @returns CSS class string for the text color
   */
  const getSkipRateColor = (skipRate: number) => {
    if (skipRate < 0.2) return "text-emerald-500";
    if (skipRate < 0.5) return "text-amber-500";
    return "text-rose-500";
  };

  // Prepare data for most played tracks chart
  const mostPlayedData = Object.entries(statistics?.trackMetrics || {})
    .sort((a, b) => b[1].playCount - a[1].playCount)
    .slice(0, 10)
    .map(([, data]) => ({
      name:
        data.name.length > 15 ? data.name.substring(0, 15) + "..." : data.name,
      plays: data.playCount,
      artist: data.artistName,
      completion: data.avgCompletionPercent || 0,
      fillColor:
        data.avgCompletionPercent > 90
          ? "#10b981"
          : data.avgCompletionPercent > 70
            ? "#f59e0b"
            : "#8b5cf6",
    }));

  // Chart configs
  const mostPlayedConfig: ChartConfig = {
    plays: {
      label: "Play Count",
      theme: {
        light: "hsl(var(--violet-500))",
        dark: "hsl(var(--violet-500))",
      },
    },
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="hover:border-primary/30 group overflow-hidden transition-all duration-200 hover:shadow-md md:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <BarChart className="text-primary h-4 w-4" />
              Most Played Tracks
            </CardTitle>
            <ToggleGroup
              type="single"
              value={mostPlayedChartType}
              onValueChange={(value: string) =>
                value && setMostPlayedChartType(value as "list" | "bar")
              }
              className="rounded-md border"
            >
              <ToggleGroupItem value="list" aria-label="List view">
                <List className="h-3.5 w-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="bar" aria-label="Bar chart">
                <BarChart3 className="h-3.5 w-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {mostPlayedChartType === "list" ? (
            // Original list view
            <ScrollArea className="h-[360px] pr-4">
              <div className="space-y-4">
                {Object.entries(statistics.trackMetrics || {})
                  .sort((a, b) => b[1].playCount - a[1].playCount)
                  .slice(0, 15)
                  .map(([trackId, data], index) => {
                    const completionPercentage = data.avgCompletionPercent || 0;
                    const isTopTrack = index < 3;

                    return (
                      <div key={trackId} className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="flex max-w-[70%] items-center gap-1.5 truncate font-medium">
                            {isTopTrack && (
                              <span className="bg-primary/10 text-primary flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold">
                                {index + 1}
                              </span>
                            )}
                            <span className={isTopTrack ? "text-primary" : ""}>
                              {data.name}
                            </span>
                          </span>
                          <span className="flex items-center gap-1.5 text-xs font-medium">
                            <PlayCircle className="text-primary h-3.5 w-3.5" />
                            {data.playCount}{" "}
                            {data.playCount === 1 ? "play" : "plays"}
                          </span>
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1 truncate pl-0 text-xs">
                          <Disc className="h-3 w-3" />
                          {data.artistName}
                          {data.hasBeenRepeated && (
                            <>
                              <span className="mx-1">•</span>
                              <Repeat className="h-3 w-3 text-violet-500" />
                              <span className="text-violet-500">Repeated</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <Progress
                              value={completionPercentage}
                              className={`h-2 ${getCompletionColor(completionPercentage)}`}
                            />
                          </div>
                          <div className="flex w-20 items-center justify-end gap-1 text-right text-xs font-medium">
                            <Check
                              className={`h-3 w-3 ${completionPercentage > 80 ? "text-emerald-500" : "text-muted-foreground"}`}
                            />
                            <span
                              className={
                                completionPercentage > 80
                                  ? "text-emerald-500"
                                  : ""
                              }
                            >
                              {completionPercentage.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          ) : (
            // Bar chart view
            <div className="h-[360px]">
              <ChartContainer
                config={mostPlayedConfig}
                className="h-full w-full"
              >
                <RechartsBarChart
                  data={mostPlayedData}
                  margin={{ top: 10, right: 30, left: 40, bottom: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tickMargin={15}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11 }}
                    label={{
                      value: "Play Count",
                      angle: -90,
                      position: "left",
                      style: {
                        fontSize: "12px",
                        textAnchor: "middle",
                      },
                    }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => [`${value} `, `${name}`]}
                        labelFormatter={(name) => {
                          const track = mostPlayedData.find(
                            (t) => t.name === name,
                          );
                          return (
                            <>
                              {name}
                              <div className="mt-1 text-xs">
                                <span>{track?.artist}</span>
                                <span className="mx-1">•</span>
                                <span>
                                  {track?.completion.toFixed(0)}% completion
                                </span>
                              </div>
                            </>
                          );
                        }}
                      />
                    }
                  />
                  <Bar
                    dataKey="plays"
                    yAxisId="left"
                    name="Plays"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                  />
                </RechartsBarChart>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="group overflow-hidden transition-all duration-200 hover:border-rose-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <SkipForward className="h-4 w-4 text-rose-500" />
            Most Skipped Tracks
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {Object.entries(statistics.trackMetrics || {})
                .filter(([, data]) => data.playCount >= 1 && data.skipCount > 0)
                .sort(
                  (a, b) =>
                    b[1].skipCount / b[1].playCount -
                    a[1].skipCount / a[1].playCount,
                )
                .slice(0, 12)
                .map(([trackId, data], index) => {
                  const skipRate = data.skipCount / data.playCount;

                  return (
                    <div
                      key={trackId}
                      className="hover:bg-muted/50 space-y-1 rounded-md px-2 py-1.5 transition-colors"
                    >
                      <div className="flex justify-between text-sm">
                        <span className="flex max-w-[80%] truncate">
                          <span className="flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500/10 text-xs font-medium text-rose-500">
                            {index + 1}
                          </span>
                          <span className="truncate font-medium">
                            {data.name}
                          </span>
                        </span>
                        <span
                          className={`flex items-center gap-1.5 text-xs ${getSkipRateColor(skipRate)}`}
                        >
                          {formatPercent(skipRate)}
                        </span>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-1.5 pl-6 text-xs">
                        <Disc className="h-3 w-3" />
                        {data.artistName}
                        <span className="mx-1">•</span>
                        <PlayCircle className="h-3 w-3" />
                        Played {data.playCount}{" "}
                        {data.playCount === 1 ? "time" : "times"}
                      </div>
                    </div>
                  );
                })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="group overflow-hidden transition-all duration-200 hover:border-indigo-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-indigo-500" />
            Recently Played
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {Object.entries(statistics.trackMetrics || {})
                .sort(
                  (a, b) =>
                    new Date(b[1].lastPlayed).getTime() -
                    new Date(a[1].lastPlayed).getTime(),
                )
                .slice(0, 12)
                .map(([trackId, data], index) => {
                  const date = new Date(data.lastPlayed);
                  const now = new Date();
                  const isToday = date.toDateString() === now.toDateString();
                  const isYesterday =
                    new Date(now.setDate(now.getDate() - 1)).toDateString() ===
                    date.toDateString();

                  const formattedDate = isToday
                    ? "Today"
                    : isYesterday
                      ? "Yesterday"
                      : date.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        });

                  const formattedTime = date.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  const isRecent = index < 3;

                  return (
                    <div
                      key={trackId}
                      className="hover:bg-muted/50 space-y-1 rounded-md px-2 py-1.5 transition-colors"
                    >
                      <div className="flex justify-between text-sm">
                        <span className="max-w-[55%] truncate font-medium">
                          {data.name}
                        </span>
                        <span
                          className={`flex items-center gap-1.5 text-xs ${isToday ? "font-semibold text-indigo-500" : ""}`}
                        >
                          <Clock
                            className={`h-3.5 w-3.5 ${isToday ? "text-indigo-500" : "text-muted-foreground"}`}
                          />
                          {formattedDate}, {formattedTime}
                        </span>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <Disc className="h-3 w-3" />
                        {data.artistName}
                        {data.hasBeenRepeated && (
                          <>
                            <span className="mx-1">•</span>
                            <Repeat className="h-3 w-3 text-violet-500" />
                            <span className="text-violet-500">Repeated</span>
                          </>
                        )}
                        {!data.hasBeenRepeated && isRecent && (
                          <>
                            <span className="mx-1">•</span>
                            <PlayCircle className="h-3 w-3 text-emerald-500" />
                            <span className="text-emerald-500">
                              Single play
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
