/**
 * Listening Session Analysis Component
 *
 * Provides detailed visualization and analysis of listening sessions,
 * including duration, device distribution, and skip behavior patterns.
 * This component gives users insights into their listening habits over time.
 *
 * Features:
 * - Recent listening sessions timeline with detailed metrics
 * - Device usage distribution with multiple visualization options
 * - Session duration and skip rate analysis
 * - Multiple chart types (list, pie chart, progress bars)
 * - Toggle between different visualization modes
 * - Loading skeleton state during data retrieval
 * - Empty state handling for new users
 *
 * This component helps users understand when, where, and how they listen
 * to music, including which devices they prefer and how their listening
 * behavior varies across different sessions and contexts.
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
  BarChart3,
  Calendar,
  Clock,
  History,
  Laptop,
  LineChart as LineChartIcon,
  List,
  Music2,
  PieChart as PieChartIcon,
  Repeat,
  SkipForward,
  Smartphone,
  Tablet,
  Timer,
  Zap,
} from "lucide-react";
import React, { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { NoDataMessage } from "./NoDataMessage";
import { formatPercent, formatTime } from "./utils";

/**
 * Props for the SessionsTab component
 *
 * @property loading - Whether statistics data is currently being loaded
 * @property statistics - Raw statistics data object or null if unavailable
 * @property recentSessions - Array of processed session data with formatting for display
 * @property recentSessions[].id - Unique identifier for the session
 * @property recentSessions[].formattedDate - Human-readable date when session occurred
 * @property recentSessions[].formattedTime - Human-readable time when session occurred
 * @property recentSessions[].formattedDuration - Human-readable duration of the session
 * @property recentSessions[].skipRate - Proportion of tracks skipped in the session (0-1)
 * @property recentSessions[].trackIds - Array of track IDs played in the session
 * @property recentSessions[].skippedTracks - Number of tracks skipped in the session
 * @property recentSessions[].deviceName - Name of device used for the session
 * @property recentSessions[].deviceType - Type category of device (phone, tablet, computer)
 */
interface SessionsTabProps {
  loading: boolean;
  statistics: StatisticsData | null;
  recentSessions: Array<{
    id: string;
    formattedDate: string;
    formattedTime: string;
    formattedDuration: string;
    skipRate: number;
    trackIds: string[];
    skippedTracks: number;
    deviceName: string;
    deviceType: string;
  }>;
}

/**
 * Listening session statistics analysis component
 *
 * Renders visualizations of session-level listening data, including
 * timeline of recent sessions, device usage distribution, and session
 * metrics. Supports multiple visualization modes for different perspectives.
 *
 * The component handles three main states:
 * - Loading state with skeleton placeholders
 * - Empty state with guidance for new users
 * - Populated state with session statistics visualizations
 *
 * @param props - Component properties
 * @param props.loading - Whether data is being loaded
 * @param props.statistics - Complete statistics data object
 * @param props.recentSessions - Array of processed recent session data
 * @returns React component with session statistics visualizations
 */
export function SessionsTab({
  loading,
  statistics,
  recentSessions,
}: SessionsTabProps) {
  // Add state for chart types
  const [devicesChartType, setDevicesChartType] = useState<"progress" | "pie">(
    "progress",
  );
  const [sessionsChartType, setSessionsChartType] = useState<"list" | "chart">(
    "list",
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="border-border/40 overflow-hidden transition-all duration-200">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <Card key={i} className="border-border/40 overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <Skeleton className="mb-2 h-4 w-32" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                        <div>
                          <Skeleton className="mb-2 h-4 w-24" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
              {Array(4)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-2 w-full flex-1" />
                      <Skeleton className="h-3 w-16" />
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!statistics || statistics.sessions.length === 0) {
    return (
      <NoDataMessage message="No session data available yet. Keep listening to music to generate insights!" />
    );
  }

  /**
   * Determines text color based on session skip rate
   *
   * Maps skip rate values to appropriate colors to provide visual feedback:
   * - Low values (< 20%): Green for sessions with few skips
   * - Medium values (20-40%): Amber for sessions with moderate skips
   * - High values (> 40%): Red for sessions with frequent skips
   *
   * @param skipRate - Skip rate as a decimal (0-1)
   * @returns CSS class string for the text color
   */
  const getSkipRateColor = (skipRate: number) => {
    if (skipRate < 0.2) return "text-emerald-500";
    if (skipRate < 0.4) return "text-amber-500";
    return "text-rose-500";
  };

  /**
   * Returns appropriate device icon based on device type
   *
   * Maps device type strings to Lucide icon components with appropriate styling:
   * - Phones/mobile devices: Smartphone icon with sky blue color
   * - Tablets/iPads: Tablet icon with indigo color
   * - All other devices: Laptop icon with violet color
   *
   * @param deviceType - Device type string (e.g., "phone", "tablet", "computer")
   * @returns React element containing the appropriate icon component
   */
  const getDeviceIcon = (deviceType: string) => {
    const type = deviceType.toLowerCase();
    if (type.includes("phone") || type.includes("mobile")) {
      return <Smartphone className="h-4 w-4 text-sky-500" />;
    } else if (type.includes("tablet") || type.includes("ipad")) {
      return <Tablet className="h-4 w-4 text-indigo-500" />;
    } else {
      return <Laptop className="h-4 w-4 text-violet-500" />;
    }
  };

  // Calculate total listening time for percentage calculations
  const totalListeningTime = Object.entries(
    statistics.sessions.reduce(
      (acc, session) => {
        const deviceType = session.deviceType || "Unknown";
        if (!acc[deviceType]) {
          acc[deviceType] = {
            count: 0,
            totalDuration: 0,
          };
        }
        acc[deviceType].count += 1;
        acc[deviceType].totalDuration += session.durationMs;
        return acc;
      },
      {} as Record<string, { count: number; totalDuration: number }>,
    ),
  ).reduce((total, [, data]) => total + data.totalDuration, 0);

  // Prepare data for device usage pie chart
  const deviceUsageData = Object.entries(
    statistics.sessions.reduce(
      (acc, session) => {
        const deviceType = session.deviceType || "Unknown";
        if (!acc[deviceType]) {
          acc[deviceType] = {
            count: 0,
            totalDuration: 0,
          };
        }
        acc[deviceType].count += 1;
        acc[deviceType].totalDuration += session.durationMs;
        return acc;
      },
      {} as Record<string, { count: number; totalDuration: number }>,
    ),
  )
    .sort((a, b) => b[1].totalDuration - a[1].totalDuration)
    .map(([deviceType, data]) => ({
      name: deviceType,
      value: data.totalDuration,
      count: data.count,
      percentage:
        totalListeningTime > 0
          ? (data.totalDuration / totalListeningTime) * 100
          : 0,
    }));

  // Prepare data for sessions timeline chart
  const sessionsTimelineData = recentSessions
    .map((session) => {
      // Use both formatted date and time
      const dateTime = `${session.formattedDate} ${session.formattedTime}`;

      // Parse duration from formattedDuration string (assuming format like "5m 20s")
      let durationInMinutes = 0;
      const durationParts = session.formattedDuration.split(" ");
      durationParts.forEach((part) => {
        if (part.includes("h")) {
          durationInMinutes += parseFloat(part.replace("h", "")) * 60;
        } else if (part.includes("m")) {
          durationInMinutes += parseFloat(part.replace("m", ""));
        } else if (part.includes("s")) {
          durationInMinutes += parseFloat(part.replace("s", "")) / 60;
        }
      });

      return {
        date: session.formattedDate,
        time: session.formattedTime,
        dateTime: dateTime,
        tracks: session.trackIds.length,
        skipped: session.skippedTracks,
        skipRate: session.skipRate * 100,
        duration: parseFloat(durationInMinutes.toFixed(1)), // Round to 1 decimal
      };
    })
    .reverse();

  // Chart configs
  const devicesChartConfig: ChartConfig = {
    device: {
      label: "Device Usage",
      theme: {
        light: "hsl(var(--sky-500))",
        dark: "hsl(var(--sky-500))",
      },
    },
  };

  const sessionsChartConfig: ChartConfig = {
    tracks: {
      label: "Tracks Played",
      theme: {
        light: "hsl(var(--violet-500))",
        dark: "hsl(var(--violet-500))",
      },
    },
    skipped: {
      label: "Tracks Skipped",
      theme: {
        light: "hsl(var(--rose-500))",
        dark: "hsl(var(--rose-500))",
      },
    },
    duration: {
      label: "Duration (min)",
      theme: {
        light: "hsl(var(--sky-500))",
        dark: "hsl(var(--sky-500))",
      },
    },
    skipRate: {
      label: "Skip Rate (%)",
      theme: {
        light: "hsl(var(--amber-500))",
        dark: "hsl(var(--amber-500))",
      },
    },
  };

  // Colors for charts
  const COLORS = ["#0ea5e9", "#8b5cf6", "#f43f5e", "#10b981", "#f59e0b"];

  return (
    <div className="space-y-4">
      <Card className="hover:border-primary/30 group overflow-hidden transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <History className="text-primary h-4 w-4" />
              Recent Listening Sessions
            </CardTitle>
            <ToggleGroup
              type="single"
              value={sessionsChartType}
              onValueChange={(value: string) =>
                value && setSessionsChartType(value as "list" | "chart")
              }
              className="rounded-md border"
            >
              <ToggleGroupItem value="list" aria-label="List view">
                <List className="h-3.5 w-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="chart" aria-label="Chart view">
                <LineChartIcon className="h-3.5 w-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {sessionsChartType === "list" ? (
            // Original list view
            recentSessions.length > 0 ? (
              <div className="relative">
                <ScrollArea className="h-[450px] overflow-auto pr-2">
                  <div className="space-y-4 pb-1">
                    {recentSessions.map((session) => (
                      <Card
                        key={session.id}
                        className="border-border/60 hover:border-primary/20 border bg-transparent transition-all duration-200 hover:shadow-sm"
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                            <div>
                              <div className="flex items-center gap-2 font-medium">
                                <Calendar className="text-primary h-4 w-4" />
                                {session.formattedDate}
                                <span className="text-muted-foreground">•</span>
                                <Clock className="h-4 w-4 text-indigo-500" />
                                {session.formattedTime}
                              </div>
                              <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
                                <Timer className="h-3.5 w-3.5" />
                                {session.formattedDuration}
                                <span className="mx-1">•</span>
                                {getDeviceIcon(session.deviceType)}
                                {session.deviceName || "Unknown device"}
                              </div>
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-1.5 font-medium">
                                <Music2 className="h-4 w-4 text-violet-500" />
                                {session.trackIds.length}{" "}
                                {session.trackIds.length === 1
                                  ? "track"
                                  : "tracks"}{" "}
                                played
                              </div>
                              <div className="flex items-center gap-1.5">
                                <SkipForward className="text-muted-foreground h-3.5 w-3.5" />
                                <span
                                  className={`${getSkipRateColor(session.skipRate)}`}
                                >
                                  {session.skippedTracks} skipped (
                                  {formatPercent(session.skipRate)})
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Adding a subtle progress bar to indicate completion rate */}
                          <div className="mt-3">
                            <div className="mb-1.5 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Completion rate
                              </span>
                              <span
                                className={
                                  session.skipRate < 0.3
                                    ? "text-emerald-500"
                                    : "text-amber-500"
                                }
                              >
                                {formatPercent(1 - session.skipRate)}
                              </span>
                            </div>
                            <Progress
                              value={(1 - session.skipRate) * 100}
                              className={`h-1.5 ${
                                session.skipRate < 0.2
                                  ? "bg-emerald-500"
                                  : session.skipRate < 0.4
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                              }`}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No recent sessions recorded.
              </p>
            )
          ) : (
            <div className="h-[450px]">
              <ChartContainer
                config={sessionsChartConfig}
                className="h-full w-full"
              >
                <AreaChart
                  data={sessionsTimelineData}
                  margin={{ top: 10, right: 30, left: 30, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="dateTime"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    tickMargin={15}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11 }}
                    label={{
                      value: "Number of Tracks",
                      angle: -90,
                      position: "left",
                      style: {
                        fontSize: "12px",
                        textAnchor: "middle",
                      },
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ paddingTop: "50px" }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => {
                          switch (name) {
                            case "Tracks Played":
                              return [`${value} `, "Tracks Played"];
                            case "Tracks Skipped":
                              return [`${value} `, "Tracks Skipped"];
                            default:
                              return [String(value), name];
                          }
                        }}
                        labelFormatter={(dateValue, payload) => {
                          if (payload && payload.length > 0) {
                            const entry = payload[0].payload;
                            return `${entry.date} ${entry.time}`;
                          }
                          return dateValue;
                        }}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="tracks"
                    name="Tracks Played"
                    yAxisId="left"
                    stackId="1"
                    fill="#8b5cf6"
                    stroke="#8b5cf6"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="skipped"
                    name="Tracks Skipped"
                    yAxisId="left"
                    stackId="1"
                    fill="#f43f5e"
                    stroke="#f43f5e"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="group overflow-hidden transition-all duration-200 hover:border-sky-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Smartphone className="h-4 w-4 text-sky-500" />
              Listening Devices
            </CardTitle>
            <ToggleGroup
              type="single"
              value={devicesChartType}
              onValueChange={(value: string) =>
                value && setDevicesChartType(value as "progress" | "pie")
              }
              className="rounded-md border"
              size="sm"
            >
              <ToggleGroupItem value="progress" aria-label="Progress bars">
                <BarChart3 className="h-3.5 w-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="pie" aria-label="Pie chart">
                <PieChartIcon className="h-3.5 w-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {devicesChartType === "progress" ? (
            // Original progress bar visualization
            <div className="space-y-3">
              {Object.entries(
                statistics.sessions.reduce(
                  (acc, session) => {
                    const deviceType = session.deviceType || "Unknown";
                    if (!acc[deviceType]) {
                      acc[deviceType] = {
                        count: 0,
                        totalDuration: 0,
                      };
                    }
                    acc[deviceType].count += 1;
                    acc[deviceType].totalDuration += session.durationMs;
                    return acc;
                  },
                  {} as Record<
                    string,
                    { count: number; totalDuration: number }
                  >,
                ),
              )
                .sort((a, b) => b[1].totalDuration - a[1].totalDuration)
                .map(([deviceType, data]) => {
                  const timePercentage =
                    totalListeningTime > 0
                      ? (data.totalDuration / totalListeningTime) * 100
                      : 0;

                  // Determine if this is a primary device (most used)
                  const isPrimaryDevice = timePercentage > 50;

                  return (
                    <div key={deviceType} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span
                          className={`flex items-center gap-1.5 font-medium ${isPrimaryDevice ? "text-sky-500" : ""}`}
                        >
                          {getDeviceIcon(deviceType)}
                          {deviceType}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <span>{data.count} sessions</span>
                          <span className="mx-0.5">•</span>
                          <span
                            className={
                              isPrimaryDevice ? "font-medium text-sky-500" : ""
                            }
                          >
                            {formatPercent(timePercentage / 100)}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Progress
                            value={timePercentage}
                            className={`h-2 ${isPrimaryDevice ? "bg-sky-500" : "bg-sky-500/50"}`}
                          />
                        </div>
                        <div className="w-24 text-right text-xs font-medium">
                          {formatTime(data.totalDuration)}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            // New pie chart visualization
            <div className="h-[300px]">
              <ChartContainer
                config={devicesChartConfig}
                className="h-full w-full"
              >
                <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <Pie
                    data={deviceUsageData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={110}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                  >
                    {deviceUsageData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [
                          `${formatTime(value as number)}`,
                          "Listening Time",
                        ]}
                        labelFormatter={(name) => {
                          const device = deviceUsageData.find(
                            (d) => d.name === name,
                          );
                          if (device) {
                            return (
                              <>
                                {name}
                                <div className="mt-1 text-xs">
                                  <span>{device.count} sessions</span>
                                  <span className="mx-1">•</span>
                                  <span>
                                    {formatPercent(device.percentage / 100)}
                                  </span>
                                </div>
                              </>
                            );
                          }
                          return name;
                        }}
                      />
                    }
                  />
                </PieChart>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="group overflow-hidden transition-all duration-200 hover:border-indigo-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Zap className="h-4 w-4 text-indigo-500" />
            Session Quality Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="border-primary/30 overflow-hidden transition-all duration-200 hover:shadow-sm">
              <CardContent className="p-4">
                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
                  <Clock className="h-3.5 w-3.5" />
                  Average session duration
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-primary text-2xl font-bold">
                    {formatTime(statistics.avgSessionDurationMs || 0)}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    per session
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-violet-300/70 transition-all duration-200 hover:shadow-sm">
              <CardContent className="p-4">
                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
                  <Repeat className="h-3.5 w-3.5" />
                  Repeat listening rate
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold text-violet-500">
                    {formatPercent(statistics.repeatListeningRate || 0)}
                  </div>
                  <div className="text-muted-foreground text-xs">of tracks</div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-emerald-300/70 transition-all duration-200 hover:shadow-sm">
              <CardContent className="p-4">
                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
                  <Zap className="h-3.5 w-3.5" />
                  Longest non-skip streak
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold text-emerald-500">
                    {Math.max(
                      ...(statistics.sessions || []).map(
                        (s) => s.longestNonSkipStreak || 0,
                      ),
                      0,
                    )}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    tracks in a row
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
