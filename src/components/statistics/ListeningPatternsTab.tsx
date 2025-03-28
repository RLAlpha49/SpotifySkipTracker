/**
 * Listening Pattern Analysis Component
 *
 * Provides in-depth visualization and analysis of listening behavior patterns
 * across different artists, times of day, and days of the week. This component
 * helps users understand their music consumption habits through multiple
 * specialized chart types and visualization options.
 *
 * Features:
 * - Artist skip rate analysis with sortable visualization
 * - Time of day listening distribution showing peak hours
 * - Day of week activity patterns with multiple chart views
 * - Toggle between different visualization modes for each metric
 * - Color-coded indicators for skip behavior patterns
 * - Loading skeleton state during data retrieval
 * - Empty state handling for new users
 *
 * This component helps users discover patterns in their listening behavior
 * that may not be immediately obvious, such as which artists they tend to skip
 * more frequently or when they listen to music most actively during the week.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { StatisticsData } from "@/types/statistics";
import {
  Activity,
  Calendar,
  Clock,
  Info,
  List,
  Music,
  PieChart as PieChartIcon,
  SkipForward,
} from "lucide-react";
import React, { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";
import { NoDataMessage } from "./NoDataMessage";
import { formatPercent, getDayName, getHourLabel } from "./utils";

/**
 * Props for the ListeningPatternsTab component
 *
 * @property loading - Whether statistics data is currently being loaded
 * @property statistics - Raw statistics data object or null if unavailable
 */
interface ListeningPatternsTabProps {
  loading: boolean;
  statistics: StatisticsData | null;
}

/**
 * Listening pattern analytics component
 *
 * Renders visualizations of listening patterns across artists, time periods,
 * and days of the week. Provides multiple visualization options for each
 * category of data through toggle controls.
 *
 * The component handles three main states:
 * - Loading state with skeleton placeholders
 * - Empty state with guidance for new users
 * - Populated state with pattern visualizations and toggleable chart types
 *
 * @param props - Component properties
 * @param props.loading - Whether data is being loaded
 * @param props.statistics - Complete statistics data object
 * @returns React component with listening pattern visualizations
 */
export function ListeningPatternsTab({
  loading,
  statistics,
}: ListeningPatternsTabProps) {
  // Add state for chart types
  const [artistChartType, setArtistChartType] = useState<string>("progress");
  const [timeChartType, setTimeChartType] = useState<string>("bar");
  const [weekdayChartType, setWeekdayChartType] = useState<string>("bar");

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/40 overflow-hidden transition-all duration-200">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="pt-4">
            <Skeleton className="h-[250px] w-full rounded-md" />
          </CardContent>
        </Card>
        <div className="grid gap-4">
          <Card className="border-border/40 overflow-hidden transition-all duration-200">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="pt-4">
              <Skeleton className="h-[115px] w-full rounded-md" />
            </CardContent>
          </Card>
          <Card className="border-border/40 overflow-hidden transition-all duration-200">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent className="pt-4">
              <Skeleton className="h-[115px] w-full rounded-md" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <NoDataMessage message="No listening pattern data available yet. Keep listening to music to generate insights!" />
    );
  }

  /**
   * Determines progress bar color based on skip rate value
   *
   * Maps skip rate values to appropriate colors to provide visual feedback:
   * - Low values (< 30%): Green to indicate rarely skipped artists
   * - Medium values (30-50%): Amber to indicate moderately skipped artists
   * - High values (> 50%): Red to indicate frequently skipped artists
   *
   * @param value - Skip rate as a decimal (0-1)
   * @returns CSS class string for the progress bar color
   */
  const getSkipRateColor = (value: number) => {
    if (value < 0.3) return "bg-emerald-500";
    if (value < 0.5) return "bg-amber-500";
    return "bg-rose-500";
  };

  /**
   * Determines hex color for chart elements based on skip rate
   *
   * Similar to getSkipRateColor but returns hex color values for use
   * in Recharts components instead of CSS class names. Uses the same
   * thresholds for color assignment.
   *
   * @param value - Skip rate as a decimal (0-1)
   * @returns Hex color string for chart elements
   */
  const getSkipRateChartColor = (value: number) => {
    if (value < 0.3) return "#10b981"; // emerald-500
    if (value < 0.5) return "#f59e0b"; // amber-500
    return "#f43f5e"; // rose-500
  };

  // Prepare data for artist skip rate chart
  const artistSkipRateData = Object.entries(statistics?.artistMetrics || {})
    .filter(([, data]) => data.tracksPlayed >= 1)
    .sort((a, b) => {
      // First sort by skip rate (highest first)
      const skipRateDiff = b[1].skipRate - a[1].skipRate;

      // If skip rates are equal (or very close), sort by number of tracks played (highest first)
      if (Math.abs(skipRateDiff) < 0.001) {
        return b[1].tracksPlayed - a[1].tracksPlayed;
      }

      return skipRateDiff;
    })
    .slice(0, 20)
    .map(([, data]) => ({
      name: data.name,
      skipRate: +(data.skipRate * 100).toFixed(1),
      tracksPlayed: data.tracksPlayed,
      color: getSkipRateChartColor(data.skipRate),
    }));

  // Ensure we display at least a few artists with 0 skip rate if they exist
  const artistsWithZeroSkipRate = Object.entries(
    statistics?.artistMetrics || {},
  )
    .filter(([, data]) => data.tracksPlayed >= 3 && data.skipRate === 0)
    .sort((a, b) => b[1].tracksPlayed - a[1].tracksPlayed) // Sort by most tracks played
    .slice(0, 5)
    .map(([, data]) => ({
      name: data.name,
      skipRate: 0,
      tracksPlayed: data.tracksPlayed,
      color: getSkipRateChartColor(0),
    }));

  // Combine the datasets, but ensure we don't exceed 20 total artists
  const combinedArtistData = [...artistSkipRateData];
  if (artistsWithZeroSkipRate.length > 0) {
    // Add up to 5 zero skip rate artists, but ensure total doesn't exceed 20
    const availableSlots = Math.min(5, 20 - artistSkipRateData.length);
    if (availableSlots > 0) {
      combinedArtistData.push(
        ...artistsWithZeroSkipRate.slice(0, availableSlots),
      );
    }
  }

  // Prepare data for time distribution chart
  const timeDistributionData = Array.from({ length: 12 }, (_, i) => {
    const hour = i * 2;
    const currentHourCount = statistics?.hourlyDistribution[hour] || 0;
    const nextHourCount = statistics?.hourlyDistribution[hour + 1] || 0;
    const combinedCount = currentHourCount + nextHourCount;

    return {
      name: getHourLabel(hour),
      value: combinedCount,
      fill: "#8884d8", // Base color for radial chart
    };
  });

  // Prepare data for weekly activity chart
  const weeklyActivityData =
    statistics?.dailyDistribution.map((count, index) => ({
      day: getDayName(index),
      count,
      fullMark: Math.max(...(statistics?.dailyDistribution || [1])),
    })) || [];

  const COLORS = [
    "#8884d8",
    "#83a6ed",
    "#8dd1e1",
    "#82ca9d",
    "#a4de6c",
    "#d0ed57",
    "#ffc658",
  ];

  // Chart configs
  const chartConfig: ChartConfig = {
    bg: {
      theme: {
        light: "hsl(var(--muted))",
        dark: "hsl(var(--muted))",
      },
    },
  };

  // Artist chart config
  const artistChartConfig: ChartConfig = {
    bg: {
      theme: {
        light: "hsl(var(--muted))",
        dark: "hsl(var(--muted))",
      },
    },
    skipRate: {
      theme: {
        light: "hsl(var(--primary))",
        dark: "hsl(var(--primary))",
      },
    },
  };

  // Weekly activity chart config
  const weeklyChartConfig: ChartConfig = {
    count: {
      label: "Tracks Played",
      theme: {
        light: "hsl(265, 89%, 78%)", // Light violet color
        dark: "hsl(265, 89%, 78%)",
      },
    },
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="group overflow-hidden transition-all duration-200 hover:border-rose-200 hover:shadow-md md:row-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <SkipForward className="h-4 w-4 text-rose-500" />
              Skip Rate by Artist (Top 20)
            </CardTitle>
            <ToggleGroup
              type="single"
              value={artistChartType}
              onValueChange={(value: string) =>
                value && setArtistChartType(value)
              }
              className="rounded-md border"
            >
              <ToggleGroupItem value="progress" aria-label="Progress bars">
                <List className="h-3.5 w-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="chart" aria-label="Bar chart">
                <Activity className="h-3.5 w-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-muted-foreground mb-4 flex items-center gap-1 text-xs">
            <Info className="h-3.5 w-3.5" />
            <span>Artists with higher skip rates appear at the top</span>
          </div>

          {artistChartType === "progress" ? (
            // Original progress bar visualization
            <div className="space-y-4">
              {combinedArtistData.map((artist) => (
                <div key={artist.name} className="flex items-center gap-3">
                  <div
                    className="w-32 min-w-32 truncate font-medium"
                    title={artist.name}
                  >
                    {artist.name}
                  </div>
                  <div className="flex-1">
                    <Progress
                      value={artist.skipRate}
                      className={`h-2 ${getSkipRateColor(artist.skipRate / 100)}`}
                    />
                  </div>
                  <div className="w-16 text-right text-sm font-semibold">
                    {formatPercent(artist.skipRate / 100)}
                  </div>
                  <div className="text-muted-foreground flex w-16 items-center justify-end gap-1 text-right text-xs">
                    <Music className="h-3 w-3" />
                    {artist.tracksPlayed}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Recharts horizontal bar chart visualization
            <ChartContainer
              config={artistChartConfig}
              className="h-[600px] w-full"
            >
              <BarChart
                layout="vertical"
                data={combinedArtistData.slice(0, 15)} // Limit to top 15 for better readability
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  width={120}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => [`${value}%`, ` ${name}`]}
                      nameKey="name"
                    />
                  }
                />
                <Bar dataKey="skipRate" name="Skip Rate" radius={[0, 4, 4, 0]}>
                  {combinedArtistData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="hover:border-primary/30 group overflow-hidden transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock className="text-primary h-4 w-4" />
              Listening Time Distribution
            </CardTitle>
            <ToggleGroup
              type="single"
              value={timeChartType}
              onValueChange={(value: string) =>
                value && setTimeChartType(value)
              }
              className="rounded-md border"
            >
              <ToggleGroupItem value="bar" aria-label="Bar display">
                <List className="h-3.5 w-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="radial" aria-label="Radial chart">
                <PieChartIcon className="h-3.5 w-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-muted-foreground mb-4 flex items-center justify-center gap-1 text-xs">
            <Clock className="h-3.5 w-3.5" />
            <span>Time of day when you listen to music</span>
          </div>

          {timeChartType === "bar" ? (
            // Original time distribution visualization
            <div className="mt-5 space-y-3">
              {Array.from({ length: 12 }, (_, i) => i * 2).map((hour) => {
                // Combine current hour with next hour (e.g., 2-4 AM)
                const currentHourCount =
                  statistics.hourlyDistribution[hour] || 0;
                const nextHourCount =
                  statistics.hourlyDistribution[hour + 1] || 0;
                const combinedCount = currentHourCount + nextHourCount;

                // Calculate all 2-hour blocks first
                const twohourBlocks = Array.from({ length: 12 }, (_, i) => {
                  const startHour = i * 2;
                  return (
                    (statistics.hourlyDistribution[startHour] || 0) +
                    (statistics.hourlyDistribution[startHour + 1] || 0)
                  );
                });

                // Find the maximum combined count across all blocks
                const maxCount = Math.max(...twohourBlocks);

                // Calculate percentage based on the max 2-hour block
                const percentage =
                  maxCount > 0 ? (combinedCount / maxCount) * 100 : 0;

                // Create time range label (e.g., "2 AM" represents 2-4 AM)
                const timeLabel = getHourLabel(hour);

                // Determine if this is a peak listening time
                const isPeak = percentage > 80;

                return (
                  <div key={hour} className="flex items-center gap-2">
                    <div className="w-16 text-xs font-medium">{timeLabel}</div>
                    <div className="flex-1">
                      <div
                        className={`${isPeak ? "bg-primary" : "bg-primary/60"} h-2.5 rounded-full transition-all duration-300`}
                        style={{ width: `${Math.max(percentage, 2)}%` }}
                      ></div>
                    </div>
                    <div className="w-10 text-right text-xs font-medium">
                      {combinedCount}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Recharts radial bar chart visualization
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[350px]"
            >
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="20%"
                outerRadius="80%"
                barSize={10}
                data={timeDistributionData.filter((d) => d.value > 0)}
                startAngle={-90}
                endAngle={270}
              >
                <RadialBar
                  background
                  dataKey="value"
                  label={{
                    position: "insideStart",
                    fill: "#fff",
                    fontSize: 10,
                  }}
                >
                  {timeDistributionData
                    .filter((d) => d.value > 0)
                    .map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                </RadialBar>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent nameKey="name" />}
                />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  iconSize={10}
                  formatter={(value) => {
                    const matchingData = timeDistributionData.find(
                      (item) => item.name === value,
                    );
                    return `${value} (${matchingData?.value || 0})`;
                  }}
                  wrapperStyle={{ fontSize: "10px", paddingLeft: "10px" }}
                />
              </RadialBarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="group overflow-hidden transition-all duration-200 hover:border-violet-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-violet-500" />
              Weekly Activity
            </CardTitle>
            <ToggleGroup
              type="single"
              value={weekdayChartType}
              onValueChange={(value: string) =>
                value && setWeekdayChartType(value)
              }
              className="rounded-md border"
            >
              <ToggleGroupItem value="bar" aria-label="Bar display">
                <List className="h-3.5 w-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="radar" aria-label="Radar chart">
                <Activity className="h-3.5 w-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-muted-foreground mb-4 flex items-center justify-center gap-1 text-xs">
            <Calendar className="h-3.5 w-3.5" />
            <span>Days of the week when you listen to music</span>
          </div>

          {weekdayChartType === "bar" ? (
            // Original weekly activity visualization
            <div className="mt-5 space-y-3">
              {statistics.dailyDistribution.map((count, day) => {
                const maxCount = Math.max(...statistics.dailyDistribution);
                const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

                // Determine if this is a peak listening day
                const isPeak = percentage > 80;

                return (
                  <div key={day} className="flex items-center gap-2">
                    <div className="w-24 text-xs font-medium">
                      {getDayName(day)}
                    </div>
                    <div className="flex-1">
                      <div
                        className={`${isPeak ? "bg-violet-500" : "bg-violet-500/60"} h-2.5 rounded-full transition-all duration-300`}
                        style={{ width: `${Math.max(percentage, 2)}%` }}
                      ></div>
                    </div>
                    <div className="w-10 text-right text-xs font-medium">
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Recharts radar chart visualization
            <ChartContainer
              config={weeklyChartConfig}
              className="mx-auto aspect-square max-h-[300px]"
            >
              <RadarChart data={weeklyActivityData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="day" tick={{ fontSize: 12 }} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent nameKey="day" />}
                />
                <Radar
                  name="Tracks Played"
                  dataKey="count"
                  stroke="var(--color-count)"
                  fill="var(--color-count)"
                  fillOpacity={0.6}
                  dot={{
                    r: 4,
                    fillOpacity: 1,
                    fill: "var(--color-count)",
                    stroke: "white",
                    strokeWidth: 1,
                  }}
                />
              </RadarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
