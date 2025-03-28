/**
 * Artist Listening Patterns Analysis Component
 *
 * Provides detailed visualization and analysis of artist-specific listening patterns,
 * including play frequency, listening time, and skip behavior. This component
 * gives users insights into their artist preferences and listening habits.
 *
 * Features:
 * - Top artists by listening time with multiple visualization options
 * - Artists with highest skip rates and contextual analysis
 * - Recently discovered artists with timeline information
 * - Searchable and sortable artist metrics
 * - Multiple chart types (progress bars, pie charts, bar charts)
 * - Toggle between different visualization modes
 * - Loading skeleton state during data retrieval
 * - Empty state handling for new users
 *
 * This component helps users understand their artist preferences, discover
 * patterns in their listening behavior across different artists, and identify
 * artists they tend to skip more frequently.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { StatisticsData } from "@/types/statistics";
import {
  BarChart3,
  Clock,
  List,
  Music,
  PieChart,
  PlayCircle,
  Search,
  SkipForward,
  SortAsc,
  Sparkles,
  ThumbsUp,
  User,
} from "lucide-react";
import React, { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  Legend as RechartsLegend,
  PieChart as RechartsPieChart,
  XAxis,
  YAxis,
} from "recharts";
import { NoDataMessage } from "./NoDataMessage";
import { formatPercent, formatTime } from "./utils";

/**
 * Props for the ArtistsTab component
 *
 * @property loading - Whether statistics data is currently being loaded
 * @property statistics - Raw statistics data object or null if unavailable
 */
interface ArtistsTabProps {
  loading: boolean;
  statistics: StatisticsData | null;
}

/**
 * Artist listening statistics analysis component
 *
 * Renders visualizations of artist-level listening data, including top artists,
 * skip patterns, and discovery timelines. Supports searching, sorting, and
 * multiple visualization modes for different analytical perspectives.
 *
 * The component handles three main states:
 * - Loading state with skeleton placeholders
 * - Empty state with guidance for new users
 * - Populated state with artist statistics visualizations
 *
 * @param props - Component properties
 * @param props.loading - Whether data is being loaded
 * @param props.statistics - Complete statistics data object
 * @returns React component with artist statistics visualizations
 */
export function ArtistsTab({ loading, statistics }: ArtistsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("recent");
  const [sortDirection, setSortDirection] = useState("desc");
  const [topArtistsChartType, setTopArtistsChartType] = useState<
    "progress" | "pie"
  >("progress");
  const [highSkipChartType, setHighSkipChartType] = useState<"list" | "bar">(
    "list",
  );

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
            <div className="space-y-3">
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
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
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40 overflow-hidden transition-all duration-200 md:col-span-2">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="pt-4">
            <Skeleton className="mb-4 h-8 w-full" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array(8)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-md" />
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!statistics || Object.keys(statistics.artistMetrics).length === 0) {
    return (
      <NoDataMessage message="No artist data available yet. Keep listening to music to generate insights!" />
    );
  }

  /**
   * Determines text color based on artist skip rate
   *
   * Maps skip rate values to appropriate colors to provide visual feedback:
   * - Low values (< 30%): Green for artists rarely skipped
   * - Medium values (30-50%): Amber for artists moderately skipped
   * - High values (> 50%): Red for artists frequently skipped
   *
   * @param skipRate - Skip rate as a decimal (0-1)
   * @returns CSS class string for the text color
   */
  const getSkipRateTextColor = (skipRate: number) => {
    if (skipRate < 0.3) return "text-emerald-500";
    if (skipRate < 0.5) return "text-amber-500";
    return "text-rose-500";
  };

  /**
   * Determines fill color for charts based on artist skip rate
   *
   * Maps skip rate values to appropriate semi-transparent colors:
   * - Low values (< 30%): Emerald green for artists rarely skipped
   * - Medium values (30-50%): Amber yellow for artists moderately skipped
   * - High values (> 50%): Rose red for artists frequently skipped
   *
   * @param skipRate - Skip rate as a decimal (0-1)
   * @returns RGBA color string for chart elements
   */
  const getSkipRateColor = (skipRate: number) => {
    if (skipRate < 0.3) return "rgba(16, 185, 129, 0.8)"; // emerald
    if (skipRate < 0.5) return "rgba(245, 158, 11, 0.8)"; // amber
    return "rgba(244, 63, 94, 0.8)"; // rose
  };

  // Prepare data for the pie chart
  const topArtistsPieData = Object.entries(statistics.artistMetrics)
    .sort((a, b) => b[1].listeningTimeMs - a[1].listeningTimeMs)
    .slice(0, 10)
    .map(([, data]) => ({
      name: data.name,
      value: data.listeningTimeMs,
      tracksPlayed: data.tracksPlayed,
      skipRate: data.skipRate,
    }));

  // Prepare data for the skip rate bar charts
  const highSkipRateData = Object.entries(statistics.artistMetrics)
    .filter(([, data]) => data.tracksPlayed >= 3)
    .sort((a, b) => b[1].skipRate - a[1].skipRate)
    .slice(0, 8)
    .map(([, data]) => ({
      name:
        data.name.length > 15 ? `${data.name.substring(0, 15)}...` : data.name,
      fullName: data.name,
      skipRate: data.skipRate * 100, // Convert to percentage
      tracksPlayed: data.tracksPlayed,
      color: getSkipRateColor(data.skipRate),
    }));

  // COLORS for the pie chart
  const COLORS = [
    "#8884d8",
    "#83a6ed",
    "#8dd1e1",
    "#82ca9d",
    "#a4de6c",
    "#d0ed57",
    "#ffc658",
    "#ff8042",
    "#ff6e76",
    "#c13c37",
  ];

  // Chart config for the donut chart
  const pieChartConfig: ChartConfig = {
    listeningTime: {
      label: "Listening Time",
      theme: {
        light: "hsl(var(--primary))",
        dark: "hsl(var(--primary))",
      },
    },
  };

  // Chart config for the skip rate chart
  const skipRateChartConfig: ChartConfig = {
    skipRate: {
      label: "Skip Rate",
      theme: {
        light: "hsl(var(--rose-500))",
        dark: "hsl(var(--rose-500))",
      },
    },
  };

  /**
   * Compares two numeric values based on selected sort direction
   *
   * Used for sorting artists by various metrics (plays, listening time, etc.)
   * in either ascending or descending order based on user selection.
   *
   * @param valA - First value to compare
   * @param valB - Second value to compare
   * @returns Negative number if A should come before B, positive if B before A
   */
  const compare = (valA: number, valB: number) => {
    const isAsc = sortDirection === "asc";
    if (valA < valB) return isAsc ? -1 : 1;
    if (valA > valB) return isAsc ? 1 : -1;
    return 0;
  };

  /**
   * Determines text color for newly discovered artists based on recency
   *
   * Maps discovery position to appropriate colors to highlight recency:
   * - Recent discoveries (top 3): Emerald green for emphasis
   * - Moderately recent (4-8): Amber yellow for some emphasis
   * - Less recent: Default theme color
   *
   * @param position - Position in the discovery timeline (1 being most recent)
   * @returns CSS class string for the text color
   */
  const getDiscoveryColor = (position: number) => {
    if (position <= 3) return "border-violet-400 bg-violet-500/10";
    if (position <= 8) return "border-violet-300/70 bg-violet-500/5";
    return "border-violet-200/40 bg-muted/40";
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="hover:border-primary/30 group overflow-hidden transition-all duration-200 hover:shadow-md md:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Music className="text-primary h-4 w-4" />
              Top Artists by Listening Time
            </CardTitle>
            <ToggleGroup
              type="single"
              value={topArtistsChartType}
              onValueChange={(value: string) =>
                value && setTopArtistsChartType(value as "progress" | "pie")
              }
              className="rounded-md border"
            >
              <ToggleGroupItem value="progress" aria-label="Progress bars">
                <List className="h-3.5 w-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="pie" aria-label="Pie chart">
                <PieChart className="h-3.5 w-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {topArtistsChartType === "progress" ? (
            <div className="space-y-4">
              {Object.entries(statistics.artistMetrics)
                .sort((a, b) => b[1].listeningTimeMs - a[1].listeningTimeMs)
                .slice(0, 10)
                .map(([artistId, data], index) => {
                  const maxTime = Math.max(
                    ...Object.values(statistics.artistMetrics).map(
                      (a) => a.listeningTimeMs,
                    ),
                  );
                  const percentage =
                    maxTime > 0 ? (data.listeningTimeMs / maxTime) * 100 : 0;

                  // Determine if this is a top artist
                  const isTopArtist = index < 3;

                  return (
                    <div key={artistId} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span
                          className={`font-medium ${isTopArtist ? "text-primary" : ""}`}
                        >
                          {isTopArtist && (
                            <span className="mr-1">#{index + 1}</span>
                          )}
                          {data.name}
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
                            className={`h-2.5 ${isTopArtist ? "bg-primary" : "bg-primary/60"}`}
                          />
                        </div>
                        <div className="flex w-32 items-center justify-end gap-1.5 text-right text-xs">
                          <PlayCircle className="text-muted-foreground h-3 w-3" />
                          <span>{data.tracksPlayed}</span>
                          <span className="text-muted-foreground mx-1">•</span>
                          <span className={getSkipRateTextColor(data.skipRate)}>
                            {formatPercent(data.skipRate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="h-[400px]">
              <ChartContainer config={pieChartConfig} className="h-full w-full">
                <RechartsPieChart
                  margin={{ top: 20, right: 20, bottom: 30, left: 20 }}
                >
                  <Pie
                    data={topArtistsPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={120}
                    innerRadius={60}
                    paddingAngle={1}
                    label={({ name, percent }) => {
                      // Shorten name for labels to prevent overlap
                      const shortName =
                        name.length > 12 ? `${name.substring(0, 12)}...` : name;
                      return `${shortName} (${(percent * 100).toFixed(0)}%)`;
                    }}
                    labelLine={{
                      stroke: "rgba(100, 116, 139, 0.5)",
                      strokeWidth: 1,
                    }}
                  >
                    {topArtistsPieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [
                          `${formatTime(value as number)}`,
                        ]}
                        labelFormatter={(label) => {
                          const entry = topArtistsPieData.find(
                            (item) => item.name === label,
                          );
                          if (entry) {
                            return (
                              <>
                                {label}
                                <div className="mt-1 text-xs">
                                  <span className="inline-flex items-center">
                                    <PlayCircle className="mr-1 h-3 w-3" />{" "}
                                    {entry.tracksPlayed} tracks
                                  </span>
                                  <span className="mx-1">•</span>
                                  <span
                                    className={getSkipRateTextColor(
                                      entry.skipRate,
                                    )}
                                  >
                                    {formatPercent(entry.skipRate)}
                                  </span>
                                </div>
                              </>
                            );
                          }
                          return label;
                        }}
                      />
                    }
                  />
                  <RechartsLegend
                    verticalAlign="bottom"
                    height={45}
                    layout="horizontal"
                    wrapperStyle={{ paddingTop: "20px" }}
                    formatter={(value: string) => {
                      return value.length > 15
                        ? `${value.substring(0, 15)}...`
                        : value;
                    }}
                  />
                </RechartsPieChart>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="group overflow-hidden transition-all duration-200 hover:border-rose-200 hover:shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <SkipForward className="h-4 w-4 text-rose-500" />
              Artists with Highest Skip Rates
            </CardTitle>
            <ToggleGroup
              type="single"
              value={highSkipChartType}
              onValueChange={(value: string) =>
                value && setHighSkipChartType(value as "list" | "bar")
              }
              className="rounded-md border"
              size="sm"
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
        <CardContent className="pt-2">
          {highSkipChartType === "list" ? (
            <div className="space-y-3">
              {Object.entries(statistics.artistMetrics)
                .filter(([, data]) => data.tracksPlayed >= 3)
                .sort((a, b) => {
                  // First sort by skip rate (highest first)
                  const skipRateDiff = b[1].skipRate - a[1].skipRate;

                  // If skip rates are equal (or very close), sort by number of tracks played (highest first)
                  if (Math.abs(skipRateDiff) < 0.001) {
                    return b[1].tracksPlayed - a[1].tracksPlayed;
                  }

                  return skipRateDiff;
                })
                .slice(0, 8)
                .map(([artistId, data], index) => (
                  <div
                    key={artistId}
                    className="hover:bg-muted/50 flex items-center justify-between rounded-md px-2 py-1.5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-4 text-xs font-medium">
                        {index + 1}
                      </span>
                      <div className="mr-2 truncate font-medium">
                        {data.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground flex items-center gap-1 text-xs">
                        <PlayCircle className="h-3 w-3" />
                        {data.tracksPlayed}
                      </span>
                      <div
                        className={`text-sm font-semibold ${getSkipRateTextColor(data.skipRate)}`}
                      >
                        {formatPercent(data.skipRate)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="h-[300px]">
              <ChartContainer
                config={skipRateChartConfig}
                className="h-full w-full"
              >
                <BarChart
                  layout="vertical"
                  data={highSkipRateData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickCount={6}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => {
                          return [
                            `${(value as number).toFixed(1)}%`,
                            " Skip Rate",
                          ];
                        }}
                        labelFormatter={(label) => {
                          const entry = highSkipRateData.find(
                            (item) => item.name === label,
                          );
                          return entry?.fullName || label;
                        }}
                      />
                    }
                  />
                  <Bar
                    dataKey="skipRate"
                    name="Skip Rate"
                    radius={[0, 4, 4, 0]}
                  >
                    {highSkipRateData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <LabelList
                      dataKey="tracksPlayed"
                      position="right"
                      formatter={(value: number) => `${value} tracks`}
                      style={{ fontSize: 10, fill: "#94a3b8" }}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="group overflow-hidden transition-all duration-200 hover:border-emerald-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ThumbsUp className="h-4 w-4 text-emerald-500" />
            Artists with Lowest Skip Rates
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {Object.entries(statistics.artistMetrics)
              .filter(([, data]) => data.tracksPlayed >= 1)
              .sort((a, b) => {
                // First sort by skip rate (lowest first)
                const skipRateDiff = a[1].skipRate - b[1].skipRate;

                // If skip rates are equal (or very close), sort by number of tracks played (highest first)
                if (Math.abs(skipRateDiff) < 0.001) {
                  return b[1].tracksPlayed - a[1].tracksPlayed;
                }

                return skipRateDiff;
              })
              .slice(0, 8)
              .map(([artistId, data], index) => (
                <div
                  key={artistId}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-md px-2 py-1.5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-4 text-xs font-medium">
                      {index + 1}
                    </span>
                    <div className="mr-2 truncate font-medium">{data.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      <PlayCircle className="h-3 w-3" />
                      {data.tracksPlayed}
                    </span>
                    <div className="text-sm font-semibold text-emerald-500">
                      {formatPercent(data.skipRate)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card className="group overflow-hidden transition-all duration-200 hover:border-violet-200 hover:shadow-md md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-violet-500" />
            New Artist Discoveries
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {!statistics.recentDiscoveries ||
          statistics.recentDiscoveries.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No new artist discoveries in the last 30 days.
            </p>
          ) : (
            <>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                  <Input
                    placeholder="Search artists..."
                    className="flex-1 pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={sortField} onValueChange={setSortField}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Discovery Date</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="plays">Tracks Played</SelectItem>
                      <SelectItem value="skip-rate">Skip Rate</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={sortDirection}
                    onValueChange={setSortDirection}
                  >
                    <SelectTrigger className="w-28">
                      <SortAsc className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <ScrollArea className="h-[260px] pr-4">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {statistics.recentDiscoveries
                    .filter(
                      (id) =>
                        statistics.artistMetrics &&
                        statistics.artistMetrics[id] &&
                        (!searchTerm ||
                          statistics.artistMetrics[id].name
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase())),
                    )
                    // Map to add discovery index before sorting
                    .map((id, index) => ({
                      id,
                      artist: statistics.artistMetrics[id],
                      discoveryIndex: index, // Higher index = more recently discovered
                    }))
                    .sort((a, b) => {
                      switch (sortField) {
                        case "name":
                          return compare(
                            a.artist.name.localeCompare(b.artist.name),
                            b.artist.name.localeCompare(a.artist.name),
                          );
                        case "plays":
                          return compare(
                            a.artist.tracksPlayed,
                            b.artist.tracksPlayed,
                          );
                        case "skip-rate":
                          return compare(a.artist.skipRate, b.artist.skipRate);
                        case "recent":
                        default:
                          // For recent, sort by discovery index (higher = more recent)
                          return compare(b.discoveryIndex, a.discoveryIndex);
                      }
                    })
                    .map(({ id, artist, discoveryIndex }, index, array) => {
                      // Create a consistent discovery indicator (higher = more recent)
                      const discoveryPosition = discoveryIndex + 1;

                      return (
                        <div
                          key={id}
                          className={`rounded-lg border p-3 ${getDiscoveryColor(discoveryPosition)} transition-all duration-200 hover:shadow-sm`}
                        >
                          <div className="truncate font-medium">
                            {artist.name}
                          </div>
                          <div className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
                            <PlayCircle className="h-3 w-3" />
                            <span>{artist.tracksPlayed} tracks</span>
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-xs">
                            <SkipForward className="text-muted-foreground h-3 w-3" />
                            <span
                              className={getSkipRateTextColor(artist.skipRate)}
                            >
                              {formatPercent(artist.skipRate)}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs font-medium text-violet-500">
                              <Sparkles className="h-3 w-3" />
                              <span>#{discoveryPosition}</span>
                            </div>
                            {discoveryPosition >= array.length - 2 && (
                              <div className="rounded-sm bg-violet-500/20 px-1.5 py-0.5 text-xs font-medium text-violet-500">
                                New
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </ScrollArea>
            </>
          )}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-center text-sm font-medium">
            <User className="h-4 w-4 text-violet-500" />
            <span>Discovery rate:</span>
            <span className="text-violet-500">
              {formatPercent(statistics.discoveryRate || 0)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
