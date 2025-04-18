/**
 * @packageDocumentation
 * @module TimeAnalyticsTab
 * @description Temporal Listening Analysis Component
 *
 * Provides in-depth visualization and analysis of listening patterns over
 * different time periods (hourly, daily, monthly). This component enables
 * users to understand when they listen to music most frequently and how
 * their listening behaviors vary across different time frames.
 *
 * Features:
 * - Monthly listening activity with comparative visualization
 * - Daily listening patterns with multi-metric analysis
 * - Hourly skip rate and listening time distributions
 * - Multiple visualization options (bar charts, line charts, area charts)
 * - Toggle between different chart types for various perspectives
 * - Highlighting of peak listening periods and patterns
 * - Loading skeleton state during data retrieval
 * - Empty state handling for new users
 *
 * This component provides users with insights into their temporal listening
 * habits, helping them identify when they listen most, when they tend to
 * skip more frequently, and how their listening behavior evolves over time.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { StatisticsData } from "@/types/statistics";
import {
  Activity,
  BarChart3,
  Calendar,
  Clock,
  Disc3,
  FastForward,
  LineChartIcon,
  List,
  MusicIcon,
} from "lucide-react";
import React, { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  Bar as RechartsBar,
  Legend as RechartsLegend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { NoDataMessage } from "./NoDataMessage";
import { formatPercent, formatTime } from "./utils";

/**
 * Props for the TimeAnalyticsTab component
 *
 * @property loading - Whether statistics data is currently being loaded
 * @property statistics - Raw statistics data object or null if unavailable
 */
interface TimeAnalyticsTabProps {
  loading: boolean;
  statistics: StatisticsData | null;
}

/**
 * Temporal listening patterns analysis component
 *
 * Renders visualizations of time-based listening patterns across multiple
 * time granularities (hourly, daily, monthly). Supports multiple chart types
 * for each time frame to provide different analytical perspectives.
 *
 * The component handles three main states:
 * - Loading state with skeleton placeholders
 * - Empty state with guidance for new users
 * - Populated state with temporal analytics visualizations
 *
 * @param props - Component properties
 * @param props.loading - Whether data is being loaded
 * @param props.statistics - Complete statistics data object
 * @returns React component with temporal listening pattern visualizations
 * @source
 */
export function TimeAnalyticsTab({
  loading,
  statistics,
}: TimeAnalyticsTabProps) {
  const [skipRateChartType, setSkipRateChartType] = useState<"bar" | "line">(
    "bar",
  );
  const [listeningTimeChartType, setListeningTimeChartType] = useState<
    "bar" | "line"
  >("bar");
  const [monthlyChartType, setMonthlyChartType] = useState<"progress" | "area">(
    "progress",
  );
  const [dailyChartType, setDailyChartType] = useState<"progress" | "composed">(
    "progress",
  );

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/40 overflow-hidden transition-all duration-200">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {Array(4)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-2 w-full" />
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
            <div className="space-y-4">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40 overflow-hidden transition-all duration-200 md:col-span-2">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-44" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <Skeleton className="h-[220px] w-full rounded-md" />
              <Skeleton className="h-[220px] w-full rounded-md" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!statistics) {
    return (
      <NoDataMessage message="No time analytics data available yet. Keep listening to music to generate insights!" />
    );
  }

  // Calculate the month with the highest listening time for highlighting
  const maxMonthlyPlays = Math.max(
    ...Object.values(statistics.monthlyMetrics).map((m) => m.tracksPlayed),
  );

  // Calculate the day with the highest listening time for highlighting
  const recentDays = Object.entries(statistics.dailyMetrics)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 7);

  const maxDailyListeningTime = Math.max(
    ...recentDays.map(([, data]) => data.listeningTimeMs),
  );

  // Determine the most recent date with data for proper chart alignment
  const mostRecentDate =
    recentDays.length > 0 ? new Date(recentDays[0][0]) : new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  mostRecentDate.setHours(0, 0, 0, 0);

  /**
   * Returns a date object for a specific day in the recent history
   *
   * Calculates actual calendar dates for chart labels and data points
   * based on index positions. Creates a consistent 14-day window for
   * visualization regardless of data availability.
   *
   * @param index - Position index in the chart (0-13 for 14-day window)
   * @returns Date object representing the actual calendar date
   */
  const getActualDateFromIndex = (index: number) => {
    // Create a new date object 14 days before today, then add the index
    // This gives us a consistent date range regardless of data availability
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    // Go back 14 days (since we're showing 14 days)
    date.setDate(date.getDate() - 13);
    // Now add the current index to move forward from earliest date
    date.setDate(date.getDate() + index);
    return date;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="hover:border-primary/30 group overflow-hidden transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="text-primary h-4 w-4" />
              Monthly Listening Activity
            </CardTitle>
            <ToggleGroup
              type="single"
              value={monthlyChartType}
              onValueChange={(value: string) =>
                value && setMonthlyChartType(value as "progress" | "area")
              }
              className="rounded-md border"
            >
              <ToggleGroupItem value="progress" aria-label="Progress bars">
                <List className="h-3.5 w-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="area" aria-label="Area chart">
                <LineChartIcon className="h-3.5 w-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {monthlyChartType === "progress" ? (
            <div className="space-y-4">
              {Object.entries(statistics.monthlyMetrics)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([month, data]) => {
                  const displayMonth = new Date(
                    month + "-01",
                  ).toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  });
                  const percentage =
                    maxMonthlyPlays > 0
                      ? (data.tracksPlayed / maxMonthlyPlays) * 100
                      : 0;

                  // Check if this is the month with the highest listening time
                  const isHighestMonth = data.tracksPlayed === maxMonthlyPlays;

                  return (
                    <div key={month} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className={isHighestMonth ? "font-medium" : ""}>
                          {displayMonth}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <Clock className="h-3 w-3" />
                          {formatTime(data.listeningTimeMs)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Progress
                            value={percentage}
                            className={`h-2.5 ${isHighestMonth ? "bg-primary" : "bg-primary/60"}`}
                          />
                        </div>
                        <div className="w-16 text-right text-xs">
                          <span className="flex items-center justify-end gap-1">
                            <MusicIcon className="h-3 w-3" />
                            <span>{data.tracksPlayed}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="h-[250px]">
              {(() => {
                // Transform monthly data for the area chart
                const monthlyData = Object.entries(statistics.monthlyMetrics)
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([month, data]) => {
                    const date = new Date(month + "-01");
                    return {
                      month: date.toLocaleDateString(undefined, {
                        month: "short",
                        year: "2-digit",
                      }),
                      tracksPlayed: data.tracksPlayed,
                      listeningTime: data.listeningTimeMs / (1000 * 60), // Convert to minutes
                      fullDate: date,
                    };
                  });

                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={monthlyData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorTracks"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0.2}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        yAxisId="left"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickFormatter={(value) => `${Math.round(value)}m`}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                      />
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="rgba(100, 116, 139, 0.2)"
                      />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === "listeningTime") {
                            return [
                              formatTime(Number(value) * 60 * 1000),
                              "Listening Time",
                            ];
                          }
                          return [
                            value,
                            name === "tracksPlayed" ? "Tracks Played" : name,
                          ];
                        }}
                        labelFormatter={(label) => {
                          const entry = monthlyData.find(
                            (d) => d.month === label,
                          );
                          return entry?.fullDate.toLocaleDateString(undefined, {
                            month: "long",
                            year: "numeric",
                          });
                        }}
                        contentStyle={{
                          backgroundColor: "rgba(15, 23, 42, 0.8)",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "12px",
                          padding: "8px 12px",
                          color: "white",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="tracksPlayed"
                        stroke="hsl(var(--primary))"
                        fillOpacity={1}
                        fill="url(#colorTracks)"
                        yAxisId="left"
                      />
                      <Line
                        type="monotone"
                        dataKey="listeningTime"
                        stroke="rgba(16, 185, 129, 0.8)"
                        strokeWidth={2}
                        yAxisId="right"
                        dot={{
                          r: 3,
                          fill: "rgba(16, 185, 129, 0.8)",
                          stroke: "white",
                          strokeWidth: 1,
                        }}
                      />
                      <RechartsLegend
                        verticalAlign="top"
                        height={36}
                        formatter={(value) => {
                          return value === "tracksPlayed"
                            ? "Tracks Played"
                            : "Listening Time";
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="group overflow-hidden transition-all duration-200 hover:border-violet-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-violet-500" />
              Daily Listening (Last 7 Days)
            </CardTitle>
            <ToggleGroup
              type="single"
              value={dailyChartType}
              onValueChange={(value: string) =>
                value && setDailyChartType(value as "progress" | "composed")
              }
              className="rounded-md border"
            >
              <ToggleGroupItem value="progress" aria-label="Progress bars">
                <List className="h-3.5 w-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="composed" aria-label="Composed chart">
                <Activity className="h-3.5 w-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {dailyChartType === "progress" ? (
            <div className="space-y-4">
              {Object.entries(statistics.dailyMetrics)
                .sort((a, b) => b[0].localeCompare(a[0])) // Sort by date descending
                .slice(0, 7) // Take last 7 days
                .reverse() // Display in chronological order
                .map(([date, data]) => {
                  const displayDate = new Date(date).toLocaleDateString(
                    undefined,
                    {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    },
                  );
                  const skipPercentage =
                    data.tracksPlayed > 0
                      ? (data.tracksSkipped / data.tracksPlayed) * 100
                      : 0;

                  // Check if this is the day with the highest listening time
                  const isHighestDay =
                    data.listeningTimeMs === maxDailyListeningTime &&
                    maxDailyListeningTime > 0;

                  // Calculate completion rate (non-skipped percentage)
                  const completionRate = 100 - skipPercentage;

                  return (
                    <div key={date} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className={isHighestDay ? "font-medium" : ""}>
                          {displayDate}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-medium">
                          <MusicIcon className="h-3 w-3" />
                          {data.tracksPlayed}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="bg-muted dark:bg-muted/50 h-2.5 overflow-hidden rounded-full">
                            <div
                              className={`h-full transition-all ${
                                completionRate > 80
                                  ? "bg-emerald-500"
                                  : completionRate > 50
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                              }`}
                              style={{
                                width: `${completionRate}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                        <div className="flex w-32 items-center justify-end gap-1 text-right text-xs">
                          <FastForward className="text-muted-foreground h-3 w-3" />
                          <span className="text-muted-foreground">
                            {formatTime(data.listeningTimeMs)}
                          </span>
                          <span className="text-muted-foreground mx-1">•</span>
                          <span
                            className={`${
                              skipPercentage < 20
                                ? "text-emerald-500"
                                : skipPercentage < 50
                                  ? "text-amber-500"
                                  : "text-rose-500"
                            }`}
                          >
                            {formatPercent(
                              data.tracksSkipped / data.tracksPlayed,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="h-[250px]">
              {(() => {
                // Transform daily data for the composed chart
                const dailyData = Object.entries(statistics.dailyMetrics)
                  .sort((a, b) => b[0].localeCompare(a[0])) // Sort by date descending
                  .slice(0, 7) // Take last 7 days
                  .reverse() // Display in chronological order
                  .map(([date, data]) => {
                    const displayDate = new Date(date).toLocaleDateString(
                      undefined,
                      { weekday: "short" },
                    );

                    const completed = data.tracksPlayed - data.tracksSkipped;

                    return {
                      day: displayDate,
                      skipped: data.tracksSkipped,
                      completed: completed,
                      listeningTime: data.listeningTimeMs / (1000 * 60), // Convert to minutes
                      fullDate: new Date(date),
                      skipRate:
                        data.tracksPlayed > 0
                          ? (data.tracksSkipped / data.tracksPlayed) * 100
                          : 0,
                    };
                  });

                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={dailyData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="rgba(100, 116, 139, 0.2)"
                      />
                      <XAxis
                        dataKey="day"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        yAxisId="left"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickFormatter={(value) => `${value}%`}
                        domain={[0, 100]}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === "listeningTime") {
                            return [
                              formatTime(Number(value) * 60 * 1000),
                              "Listening Time",
                            ];
                          }
                          if (name === "skipRate") {
                            return [
                              `${Number(value).toFixed(1)}%`,
                              "Skip Rate",
                            ];
                          }
                          return [
                            value,
                            typeof name === "string"
                              ? name.charAt(0).toUpperCase() + name.slice(1)
                              : name,
                          ];
                        }}
                        labelFormatter={(label) => {
                          const entry = dailyData.find((d) => d.day === label);
                          return entry?.fullDate.toLocaleDateString(undefined, {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          });
                        }}
                        contentStyle={{
                          backgroundColor: "rgba(15, 23, 42, 0.8)",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "12px",
                          padding: "8px 12px",
                          color: "white",
                        }}
                      />
                      <RechartsBar
                        dataKey="completed"
                        name="Completed"
                        stackId="a"
                        fill="rgba(16, 185, 129, 0.7)"
                        radius={[4, 4, 0, 0]}
                        yAxisId="left"
                      />
                      <RechartsBar
                        dataKey="skipped"
                        name="Skipped"
                        stackId="a"
                        fill="rgba(244, 63, 94, 0.7)"
                        radius={[4, 4, 0, 0]}
                        yAxisId="left"
                      />
                      <Line
                        type="monotone"
                        dataKey="skipRate"
                        name="Skip Rate"
                        stroke="rgba(244, 63, 94, 0.9)"
                        strokeWidth={2}
                        yAxisId="right"
                        dot={{
                          r: 3,
                          fill: "rgba(244, 63, 94, 0.9)",
                          stroke: "white",
                          strokeWidth: 1,
                        }}
                      />
                      <RechartsLegend verticalAlign="top" height={36} />
                    </ComposedChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="group mt-0 overflow-hidden transition-all duration-200 hover:border-cyan-200 hover:shadow-md md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <MusicIcon className="h-4 w-4 text-cyan-500" />
            Listening Trends (Last 14 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div>
                <div className="mb-10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Disc3 className="h-4 w-4 text-rose-500" />
                    Skip Rate Trend
                  </div>
                  <ToggleGroup
                    type="single"
                    value={skipRateChartType}
                    onValueChange={(value: string) =>
                      value && setSkipRateChartType(value as "bar" | "line")
                    }
                    className="rounded-md border"
                  >
                    <ToggleGroupItem value="bar" aria-label="Bar chart">
                      <BarChart3 className="h-3.5 w-3.5" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="line" aria-label="Line chart">
                      <LineChartIcon className="h-3.5 w-3.5" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {skipRateChartType === "bar" ? (
                  <div className="flex h-[180px] items-end justify-between gap-1">
                    {(statistics.recentSkipRateTrend || Array(14).fill(0)).map(
                      (rate, index) => {
                        const barHeight = 160; // Fixed height for visualization area
                        const minBarHeight = 4; // Minimum visible height
                        const barHeightPx =
                          rate > 0
                            ? Math.max(
                                Math.floor(rate * barHeight),
                                minBarHeight,
                              )
                            : minBarHeight;

                        const date = getActualDateFromIndex(index);
                        const day = date.getDate();

                        // Determine color based on skip rate
                        const getColorClass = (rate: number) => {
                          if (rate === 0) return "bg-muted/40 dark:bg-muted/20";
                          if (rate < 0.3) return "bg-emerald-500";
                          if (rate < 0.5) return "bg-amber-500";
                          return "bg-rose-500";
                        };

                        return (
                          <div
                            key={index}
                            className="flex flex-1 flex-col items-center gap-1"
                          >
                            <div
                              className={`mb-1 text-xs font-medium ${
                                rate > 0.5
                                  ? "text-rose-500"
                                  : rate > 0.3
                                    ? "text-amber-500"
                                    : rate > 0
                                      ? "text-emerald-500"
                                      : "text-muted-foreground"
                              }`}
                            >
                              {rate > 0 ? `${Math.round(rate * 100)}%` : "-"}
                            </div>
                            <div
                              className="bg-muted/30 dark:bg-muted/10 relative w-full overflow-hidden rounded-sm"
                              style={{
                                height: "160px",
                              }}
                            >
                              <div
                                className={`absolute bottom-0 w-full transition-all duration-500 ${getColorClass(rate)}`}
                                style={{ height: `${barHeightPx}px` }}
                              ></div>
                            </div>
                            <div className="text-xs font-medium">{day}</div>
                          </div>
                        );
                      },
                    )}
                  </div>
                ) : (
                  <div className="h-[200px] w-full">
                    {/* Prepare data for Recharts */}
                    {(() => {
                      const data = (
                        statistics.recentSkipRateTrend || Array(14).fill(0)
                      ).map((rate, index) => {
                        const date = getActualDateFromIndex(index);
                        const day = date.getDate();
                        const month = date.toLocaleString("default", {
                          month: "short",
                        });

                        return {
                          day: `${day} ${month}`,
                          skipRate: rate * 100, // Convert to percentage
                          color:
                            rate > 0.5
                              ? "#f43f5e"
                              : rate > 0.3
                                ? "#f59e0b"
                                : "#10b981",
                        };
                      });

                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={data}
                            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="rgba(100, 116, 139, 0.2)"
                            />
                            <XAxis
                              dataKey="day"
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 11 }}
                              tickFormatter={(value) => value.split(" ")[0]}
                              padding={{ left: 10, right: 10 }}
                            />
                            <YAxis
                              domain={[0, 100]}
                              tickCount={5}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 11 }}
                              tickFormatter={(value) => `${value}%`}
                            />
                            <Tooltip
                              formatter={(value) => [
                                `${(value as number).toFixed(1)}%`,
                                "Skip Rate",
                              ]}
                              labelFormatter={(label) => label}
                              contentStyle={{
                                backgroundColor: "rgba(15, 23, 42, 0.8)",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "12px",
                                padding: "8px 12px",
                                color: "white",
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="skipRate"
                              stroke="rgba(244, 63, 94, 0.8)"
                              strokeWidth={2}
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              dot={(props: any) => {
                                const { cx, cy, index } = props;
                                // Always return a circle element, don't return null
                                if (
                                  cx === undefined ||
                                  cy === undefined ||
                                  index === undefined
                                ) {
                                  return (
                                    <circle cx={0} cy={0} r={0} fill="none" />
                                  );
                                }
                                const rate = data[index].skipRate / 100;

                                let fillColor = "rgba(74, 222, 128, 0.8)";
                                if (rate > 0.5)
                                  fillColor = "rgba(244, 63, 94, 0.8)";
                                else if (rate > 0.3)
                                  fillColor = "rgba(245, 158, 11, 0.8)";

                                return (
                                  <circle
                                    cx={cx}
                                    cy={cy}
                                    r={4}
                                    fill={fillColor}
                                    stroke="white"
                                    strokeWidth={1}
                                  />
                                );
                              }}
                              activeDot={{ r: 6, fill: "rgba(244, 63, 94, 1)" }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FastForward className="h-4 w-4 text-emerald-500" />
                    Listening Time Trend
                  </div>
                  <ToggleGroup
                    type="single"
                    value={listeningTimeChartType}
                    onValueChange={(value: string) =>
                      value &&
                      setListeningTimeChartType(value as "bar" | "line")
                    }
                    className="rounded-md border"
                  >
                    <ToggleGroupItem value="bar" aria-label="Bar chart">
                      <BarChart3 className="h-3.5 w-3.5" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="line" aria-label="Line chart">
                      <LineChartIcon className="h-3.5 w-3.5" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {listeningTimeChartType === "bar" ? (
                  <div className="flex h-[180px] items-end justify-between gap-1">
                    {(
                      statistics.recentListeningTimeTrend || Array(14).fill(0)
                    ).map((time, index) => {
                      const maxTime = Math.max(
                        ...(statistics.recentListeningTimeTrend || [1]),
                        1,
                      );

                      const barHeight = 160; // Fixed height for visualization area
                      const minBarHeight = 4; // Minimum visible height
                      const barHeightPx =
                        time > 0
                          ? Math.max(
                              Math.floor((time / maxTime) * barHeight),
                              minBarHeight,
                            )
                          : minBarHeight;

                      const date = getActualDateFromIndex(index);
                      const day = date.getDate();

                      // Determine intensity based on relative time
                      const getTimeColorClass = (
                        time: number,
                        maxTime: number,
                      ) => {
                        if (time === 0) return "bg-muted/40 dark:bg-muted/20";
                        const ratio = time / maxTime;
                        if (ratio > 0.8) return "bg-emerald-500";
                        if (ratio > 0.4) return "bg-emerald-500/80";
                        return "bg-emerald-500/60";
                      };

                      return (
                        <div
                          key={index}
                          className="flex flex-1 flex-col items-center gap-1"
                        >
                          <div className="mb-1 text-xs font-medium text-emerald-500/90">
                            {time > 0 ? formatTime(time) : "-"}
                          </div>
                          <div
                            className="bg-muted/30 dark:bg-muted/10 relative w-full overflow-hidden rounded-sm"
                            style={{
                              height: "160px",
                            }}
                          >
                            <div
                              className={`absolute bottom-0 w-full transition-all duration-500 ${getTimeColorClass(time, maxTime)}`}
                              style={{ height: `${barHeightPx}px` }}
                            ></div>
                          </div>
                          <div className="text-xs font-medium">{day}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-[200px] w-full">
                    {/* Prepare data for Recharts */}
                    {(() => {
                      const maxTime = Math.max(
                        ...(statistics.recentListeningTimeTrend || [1]),
                        1,
                      );
                      const data = (
                        statistics.recentListeningTimeTrend || Array(14).fill(0)
                      ).map((time, index) => {
                        const date = getActualDateFromIndex(index);
                        const day = date.getDate();
                        const month = date.toLocaleString("default", {
                          month: "short",
                        });
                        const normalizedValue = time / maxTime;

                        return {
                          day: `${day} ${month}`,
                          time: time,
                          timeLabel: time > 0 ? formatTime(time) : "-",
                          normalizedValue: normalizedValue,
                        };
                      });

                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={data}
                            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="rgba(100, 116, 139, 0.2)"
                            />
                            <XAxis
                              dataKey="day"
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 11 }}
                              tickFormatter={(value) => value.split(" ")[0]}
                              padding={{ left: 10, right: 10 }}
                            />
                            <YAxis
                              tickCount={5}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 11 }}
                              tickFormatter={(value) =>
                                formatTime(value as number)
                              }
                            />
                            <Tooltip
                              formatter={(value) => [
                                formatTime(value as number),
                                "Listening Time",
                              ]}
                              labelFormatter={(label) => label}
                              contentStyle={{
                                backgroundColor: "rgba(15, 23, 42, 0.8)",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "12px",
                                padding: "8px 12px",
                                color: "white",
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="time"
                              stroke="rgba(16, 185, 129, 0.8)"
                              strokeWidth={2}
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              dot={(props: any) => {
                                const { cx, cy, index } = props;
                                // Always return a circle element, don't return null
                                if (
                                  cx === undefined ||
                                  cy === undefined ||
                                  index === undefined
                                ) {
                                  return (
                                    <circle cx={0} cy={0} r={0} fill="none" />
                                  );
                                }
                                const normalizedValue =
                                  data[index].normalizedValue;

                                let pointColor = "rgba(16, 185, 129, 0.6)";
                                if (normalizedValue > 0.8)
                                  pointColor = "rgba(16, 185, 129, 1)";
                                else if (normalizedValue > 0.4)
                                  pointColor = "rgba(16, 185, 129, 0.8)";

                                return (
                                  <circle
                                    cx={cx}
                                    cy={cy}
                                    r={4}
                                    fill={pointColor}
                                    stroke="white"
                                    strokeWidth={1}
                                  />
                                );
                              }}
                              activeDot={{
                                r: 6,
                                fill: "rgba(16, 185, 129, 1)",
                              }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Determines color based on skip rate
 *
 * @param rate - Skip rate as a decimal (0-1)
 * @returns CSS class string for the color
 * @source
 */

/**
 * Determines intensity based on relative time
 *
 * @param time - Listening time value
 * @param maxTime - Maximum listening time in the dataset
 * @returns CSS class string for the color
 * @source
 */
