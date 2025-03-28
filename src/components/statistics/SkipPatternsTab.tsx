/**
 * Skip Pattern Detection and Analysis Component
 *
 * Provides advanced visualization and analysis of algorithmically detected
 * patterns in user's track skipping behavior. This component helps users
 * understand their unconscious listening preferences and behaviors.
 *
 * Features:
 * - Pattern type distribution with multiple visualization options
 * - Confidence level analysis for detected patterns
 * - Detailed pattern descriptions with evidence and examples
 * - Filtering capabilities by pattern type
 * - Interactive expanding/collapsing of pattern details
 * - Manual refresh for updated pattern detection
 * - Multiple chart types (bar charts, pie charts, radial charts)
 * - Loading skeleton state during data retrieval
 * - Empty and error state handling
 *
 * This component leverages machine learning algorithms to identify meaningful
 * patterns in skipping behavior, helping users gain deeper insights into their
 * listening habits that may not be immediately obvious through standard metrics.
 */

import { formatPercent } from "@/components/statistics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DetectedPattern } from "@/types/pattern-detector";
import { StatisticsData } from "@/types/statistics";
import "@/types/statistics-api";
import {
  Activity,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock,
  List,
  PieChart as PieChartIcon,
  RefreshCw,
  Repeat,
  SkipForward,
  User,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Props for the SkipPatternsTab component
 *
 * @property loading - Whether statistics data is currently being loaded
 * @property statistics - Raw statistics data object or null if unavailable
 */
interface SkipPatternsTabProps {
  loading: boolean;
  statistics: StatisticsData | null;
}

/**
 * Formats date strings into locale-specific human-readable format
 *
 * Converts ISO date strings to formatted dates with month, day and year.
 * Handles potential parsing errors with a fallback value.
 *
 * @param dateStr - Date string to format
 * @returns Formatted date string or "Unknown date" if parsing fails
 */
const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Unknown date";
  }
};

/**
 * Returns appropriate icon component based on pattern type
 *
 * Maps different pattern types to relevant Lucide icon components:
 * - Artist aversion: User icon
 * - Time of day: Clock icon
 * - Context specific: List icon
 * - Immediate skip: SkipForward icon
 * - Skip streak: Repeat icon
 *
 * @param type - Pattern type identifier string
 * @returns React element containing the appropriate icon component
 */
const getPatternIcon = (type: string) => {
  switch (type) {
    case "artist_aversion":
      return <User className="h-4 w-4" />;
    case "time_of_day":
      return <Clock className="h-4 w-4" />;
    case "context_specific":
      return <List className="h-4 w-4" />;
    case "immediate_skip":
      return <SkipForward className="h-4 w-4" />;
    case "skip_streak":
      return <Repeat className="h-4 w-4" />;
    default:
      return <SkipForward className="h-4 w-4" />;
  }
};

/**
 * Determines text color based on pattern confidence level
 *
 * Maps confidence values to appropriate colors to provide visual feedback:
 * - High confidence (≥ 90%): Green for highly reliable patterns
 * - Medium confidence (80-89%): Amber for moderately reliable patterns
 * - Lower confidence (< 80%): Slate for patterns requiring more evidence
 *
 * @param confidence - Pattern confidence as a decimal (0-1)
 * @returns CSS class string for the text color
 */
const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.9) return "text-emerald-500";
  if (confidence >= 0.8) return "text-amber-500";
  return "text-slate-500";
};

/**
 * Determines fill color based on pattern type for chart visualization
 *
 * Maps pattern types to consistent colors for unified visualization:
 * - Artist aversion: Purple
 * - Time of day: Green
 * - Context specific: Yellow
 * - Immediate skip: Orange
 * - Skip streak: Blue
 *
 * @param type - Pattern type identifier string
 * @returns Hex color code for chart elements
 */
const getTypeColor = (type: string) => {
  switch (type) {
    case "artist_aversion":
      return "#8884d8"; // Purple
    case "time_of_day":
      return "#82ca9d"; // Green
    case "context_specific":
      return "#ffc658"; // Yellow
    case "immediate_skip":
      return "#ff8042"; // Orange
    case "skip_streak":
      return "#0088fe"; // Blue
    default:
      return "#8884d8"; // Default purple
  }
};

/**
 * Custom type definition for pattern distribution chart data
 *
 * @property type - Display-friendly pattern type name (capitalized with spaces)
 * @property rawType - Original pattern type identifier from the API
 * @property count - Number of patterns of this type
 * @property color - Hex color code for visualization
 */
type PatternTypeData = {
  type: string;
  rawType: string;
  count: number;
  color: string;
};

/**
 * Skip pattern analysis component
 *
 * Renders visualizations of algorithmically detected patterns in
 * skip behavior. Provides multiple chart types, filtering options,
 * and detailed pattern information with evidence.
 *
 * The component handles multiple states:
 * - Loading state with skeleton placeholders
 * - Error state with message and retry option
 * - Empty state for users with insufficient data
 * - Populated state with pattern visualizations and details
 *
 * @param props - Component properties
 * @param props.loading - Whether main statistics data is being loaded
 * @returns React component with skip pattern analysis
 */
export function SkipPatternsTab({ loading }: SkipPatternsTabProps) {
  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);
  const [patternLoading, setPatternLoading] = useState(true);
  const [patternError, setPatternError] = useState<string | null>(null);
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [typeChartView, setTypeChartView] = useState<"pie" | "bar">("pie");
  const [confidenceChartView, setConfidenceChartView] = useState<
    "bar" | "radial"
  >("bar");

  /**
   * Fetches skip pattern data from the API
   *
   * Retrieves algorithmically detected patterns through the statistics API.
   * Handles success, failure, and error states appropriately.
   * Updates component state with fetched data or error messages.
   */
  const fetchPatterns = async () => {
    setPatternLoading(true);
    try {
      // Use statisticsAPI instead of spotify
      const response = await window.statisticsAPI.getSkipPatterns();
      console.log("Fetched patterns response:", response);

      if (response.success && response.data) {
        setPatterns(response.data);
        setPatternError(null);
      } else {
        setPatterns([]);
        setPatternError(response.error || "Failed to load patterns");
      }
    } catch (err) {
      console.error("Error fetching skip patterns:", err);
      setPatternError("Failed to load skip patterns");
      window.spotify.saveLog(
        `Error fetching skip patterns: ${err instanceof Error ? err.message : String(err)}`,
        "ERROR",
      );
    } finally {
      setPatternLoading(false);
    }
  };

  // Fetch patterns on component mount and when refresh is triggered
  useEffect(() => {
    fetchPatterns();
  }, [refreshTrigger]);

  // Toggle pattern expansion
  const handleExpandPattern = (patternId: string) => {
    setExpandedPattern(expandedPattern === patternId ? null : patternId);
  };

  /**
   * Updates active filter for pattern types
   *
   * Controls filtering of patterns by type (artist aversion, time of day, etc.)
   * Toggles filter off if the same type is selected twice.
   *
   * @param type - Pattern type to filter by, or null to clear filter
   */
  const handleFilterChange = (type: string | null) => {
    setActiveFilter(activeFilter === type ? null : type);
  };

  // Get filtered patterns
  const filteredPatterns = activeFilter
    ? patterns.filter((p) => p.type === activeFilter)
    : patterns;

  /**
   * Generates aggregated data for pattern type distribution chart
   *
   * Groups patterns by type and formats data for visualization.
   * Adds display-friendly type names and appropriate colors.
   *
   * @returns Array of pattern type distribution data objects for charts
   */
  const getPatternsByType = () => {
    const groupedPatterns: Record<string, number> = {};

    patterns.forEach((pattern) => {
      groupedPatterns[pattern.type] = (groupedPatterns[pattern.type] || 0) + 1;
    });

    return Object.entries(groupedPatterns).map(([type, count]) => ({
      type: type
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
      rawType: type,
      count,
      color: getTypeColor(type),
    }));
  };

  /**
   * Generates data for confidence level distribution chart
   *
   * Groups patterns by confidence level ranges and formats for visualization.
   * Maps confidence ranges to appropriate colors based on reliability.
   *
   * @returns Array of confidence distribution data objects for charts
   */
  const getConfidenceDistribution = () => {
    const ranges = [
      { range: "70-75%", count: 0, color: "#d1d5db" }, // Gray
      { range: "75-80%", count: 0, color: "#94a3b8" }, // Slate
      { range: "80-85%", count: 0, color: "#64748b" }, // Slate darker
      { range: "85-90%", count: 0, color: "#f59e0b" }, // Amber
      { range: "90-95%", count: 0, color: "#10b981" }, // Emerald
      { range: "95-100%", count: 0, color: "#059669" }, // Emerald darker
    ];

    const patternsToUse = activeFilter ? filteredPatterns : patterns;

    patternsToUse.forEach((pattern) => {
      const confidence = pattern.confidence * 100;
      if (confidence >= 95) ranges[5].count++;
      else if (confidence >= 90) ranges[4].count++;
      else if (confidence >= 85) ranges[3].count++;
      else if (confidence >= 80) ranges[2].count++;
      else if (confidence >= 75) ranges[1].count++;
      else ranges[0].count++;
    });

    return ranges;
  };

  // Generate data for the pattern type distribution chart
  const patternTypeData = getPatternsByType();

  // Generate data for confidence distribution chart
  const confidenceData = getConfidenceDistribution();

  /**
   * Generates data for pattern occurrence trend analysis
   *
   * Groups patterns by detection date to show trends over time.
   * Formats dates and counts for time-series visualization.
   *
   * @returns Array of trend data objects for timeline charts
   */
  const getOccurrenceTrend = () => {
    const patternsToUse = activeFilter ? filteredPatterns : patterns;
    const dateMap: Record<string, number> = {};

    patternsToUse.forEach((pattern) => {
      if (!pattern.firstDetected) return;

      // Group by month-year for trend
      const date = new Date(pattern.firstDetected);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;

      dateMap[monthYear] = (dateMap[monthYear] || 0) + 1;
    });

    // Sort dates and convert to chart format
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        formattedDate: new Date(date).toLocaleDateString(undefined, {
          month: "short",
          year: "numeric",
        }),
        count,
      }));
  };

  // Chart data for occurrence trend
  const occurrenceTrendData = getOccurrenceTrend();

  // Chart configs
  const typeChartConfig: ChartConfig = {
    count: {
      label: "Pattern Count",
      theme: {
        light: "hsl(var(--primary))",
        dark: "hsl(var(--primary))",
      },
    },
  };

  const confidenceChartConfig: ChartConfig = {
    count: {
      label: "Patterns",
      theme: {
        light: "hsl(var(--primary))",
        dark: "hsl(var(--primary))",
      },
    },
  };

  /**
   * Triggers a refresh of pattern data from the API
   *
   * Initiates a new API call to retrieve the latest detected patterns.
   * Updates loading state and increment refresh trigger to re-run effect.
   */
  const handleRefresh = async () => {
    try {
      setPatternLoading(true);
      console.log("Detecting patterns...");

      // First trigger data aggregation
      const aggregationResult = await window.statisticsAPI.triggerAggregation();
      console.log("Aggregation result:", aggregationResult);

      if (!aggregationResult.success) {
        setPatternError(
          aggregationResult.message || "Failed to aggregate skip data",
        );
        setPatternLoading(false);
        return;
      }

      // Then detect patterns
      const detectionResult = await window.statisticsAPI.detectPatterns();
      console.log("Pattern detection result:", detectionResult);

      if (!detectionResult.success) {
        setPatternError(detectionResult.message || "Failed to detect patterns");
        setPatternLoading(false);
        return;
      }

      // Refresh the pattern list
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Error detecting patterns:", err);
      setPatternError("Failed to analyze skip patterns");
      window.spotify.saveLog(`Error detecting patterns: ${err}`, "ERROR");
      setPatternLoading(false);
    }
  };

  // Loading state
  if (loading || patternLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No patterns state
  if (patterns.length === 0) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SkipForward className="text-primary h-5 w-5" />
            Skip Pattern Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <SkipForward className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">
              No Skip Patterns Detected Yet
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              We haven&apos;t detected any significant patterns in your
              listening behavior yet. Keep using Spotify, and we&apos;ll analyze
              your skip patterns over time.
            </p>
            <Button onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Analyze Now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (patternError) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SkipForward className="text-primary h-5 w-5" />
            Skip Pattern Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <SkipForward className="text-muted-foreground mb-4 h-10 w-10" />
            <h3 className="mb-2 text-lg font-semibold">
              Error Loading Patterns
            </h3>
            <p className="text-muted-foreground mb-4">{patternError}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Pattern Type Distribution Chart */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <PieChartIcon className="text-primary h-4 w-4" />
            Pattern Type Distribution
          </CardTitle>
          <ToggleGroup
            type="single"
            value={typeChartView}
            onValueChange={(value) =>
              value && setTypeChartView(value as "pie" | "bar")
            }
            className="rounded-md border"
          >
            <ToggleGroupItem value="pie" aria-label="Pie Chart">
              <PieChartIcon className="h-3.5 w-3.5" />
            </ToggleGroupItem>
            <ToggleGroupItem value="bar" aria-label="Bar Chart">
              <BarChart3 className="h-3.5 w-3.5" />
            </ToggleGroupItem>
          </ToggleGroup>
        </CardHeader>
        <CardContent className="pt-4">
          {typeChartView === "pie" ? (
            <ChartContainer
              config={typeChartConfig}
              className="h-[350px] w-full"
            >
              <PieChart margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
                <Pie
                  data={patternTypeData}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  innerRadius={40}
                  paddingAngle={1}
                  onClick={(data) =>
                    handleFilterChange(
                      (data.payload as PatternTypeData).rawType,
                    )
                  }
                  label={({ type, count }) => `${type} (${count})`}
                  labelLine={{
                    stroke: "rgba(156, 163, 175, 0.5)",
                    strokeWidth: 1,
                  }}
                >
                  {patternTypeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke={activeFilter === entry.rawType ? "#000" : "none"}
                      strokeWidth={activeFilter === entry.rawType ? 2 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => [
                        `${value} patterns`,
                        name as string,
                      ]}
                    />
                  }
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  onClick={(data) => {
                    const item = data as unknown as PatternTypeData;
                    handleFilterChange(item.rawType);
                  }}
                />
              </PieChart>
            </ChartContainer>
          ) : (
            <ChartContainer
              config={typeChartConfig}
              className="h-[350px] w-full"
            >
              <BarChart
                data={patternTypeData}
                margin={{ top: 10, right: 10, bottom: 40, left: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  opacity={0.3}
                />
                <XAxis
                  dataKey="type"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => [
                        `${value} patterns`,
                        name as string,
                      ]}
                    />
                  }
                />
                <Bar
                  dataKey="count"
                  onClick={(data) => {
                    const item = data as unknown as {
                      payload: PatternTypeData;
                    };
                    handleFilterChange(item.payload.rawType);
                  }}
                  radius={[4, 4, 0, 0]}
                >
                  {patternTypeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke={activeFilter === entry.rawType ? "#000" : "none"}
                      strokeWidth={activeFilter === entry.rawType ? 2 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Confidence Distribution Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="text-primary h-4 w-4" />
            Confidence Distribution
          </CardTitle>
          <ToggleGroup
            type="single"
            value={confidenceChartView}
            onValueChange={(value) =>
              value && setConfidenceChartView(value as "bar" | "radial")
            }
            className="rounded-md border"
          >
            <ToggleGroupItem value="bar" aria-label="Bar Chart">
              <BarChart3 className="h-3.5 w-3.5" />
            </ToggleGroupItem>
            <ToggleGroupItem value="radial" aria-label="Radial Chart">
              <PieChartIcon className="h-3.5 w-3.5" />
            </ToggleGroupItem>
          </ToggleGroup>
        </CardHeader>
        <CardContent className="pt-4">
          {confidenceChartView === "bar" ? (
            <ChartContainer
              config={confidenceChartConfig}
              className="h-[350px] w-full"
            >
              <BarChart
                data={confidenceData}
                margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                layout="vertical"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  opacity={0.3}
                />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  dataKey="range"
                  type="category"
                  tick={{ fontSize: 11 }}
                  width={60}
                />
                <Tooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => [
                        `${value} patterns`,
                        name as string,
                      ]}
                    />
                  }
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {confidenceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <ChartContainer
              config={confidenceChartConfig}
              className="h-[350px] w-full"
            >
              <RadialBarChart
                innerRadius="20%"
                outerRadius="90%"
                data={confidenceData}
                startAngle={180}
                endAngle={0}
                cy="70%"
                margin={{ top: 0, right: 0, bottom: 20, left: 0 }}
              >
                <RadialBar
                  background
                  dataKey="count"
                  label={{
                    position: "insideStart",
                    fill: "#fff",
                    fontSize: 10,
                  }}
                >
                  {confidenceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </RadialBar>
                <Tooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, data) => [
                        `${value} patterns`,
                        `Confidence: ${data.payload.range}`,
                      ]}
                    />
                  }
                />
                <Legend
                  iconSize={10}
                  layout="horizontal"
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: "10px" }}
                />
              </RadialBarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Pattern Occurrence Chart */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Activity className="text-primary h-4 w-4" />
            Pattern Detection History
            {activeFilter && (
              <Badge
                variant="outline"
                className="ml-2 cursor-pointer"
                onClick={() => setActiveFilter(null)}
              >
                Filtered • Clear
              </Badge>
            )}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Refresh Data
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <ChartContainer
            config={confidenceChartConfig}
            className="h-[200px] w-full"
          >
            <BarChart
              data={occurrenceTrendData}
              margin={{ top: 10, right: 10, bottom: 30, left: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                opacity={0.3}
              />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 11 }}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                allowDecimals={false}
                label={{
                  value: "Patterns Detected",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 12 },
                }}
              />
              <Tooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name, data) => [
                      `${value} patterns`,
                      `${data.payload.formattedDate}`,
                    ]}
                  />
                }
              />
              <Bar
                dataKey="count"
                fill={
                  activeFilter
                    ? getTypeColor(activeFilter)
                    : "var(--color-count)"
                }
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Pattern List */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle>Detected Patterns ({filteredPatterns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredPatterns
              .sort((a, b) => b.confidence - a.confidence)
              .map((pattern, index) => {
                const patternId = `pattern-${index}`;
                const isExpanded = expandedPattern === patternId;
                const confidencePercent = Math.round(pattern.confidence * 100);

                return (
                  <Collapsible
                    key={patternId}
                    open={isExpanded}
                    onOpenChange={() => handleExpandPattern(patternId)}
                    className="bg-card rounded-lg border shadow-sm"
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="bg-muted flex h-9 w-9 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: `${getTypeColor(pattern.type)}15`,
                          }}
                        >
                          {getPatternIcon(pattern.type)}
                        </div>
                        <div>
                          <div className="font-medium">
                            {pattern.description}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            First seen: {formatDate(pattern.firstDetected)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            confidencePercent > 85 ? "default" : "outline"
                          }
                          className={`whitespace-nowrap ${getConfidenceColor(pattern.confidence)}`}
                        >
                          {confidencePercent}% confidence
                        </Badge>
                        <Badge variant="outline" className="whitespace-nowrap">
                          {pattern.occurrences} occurrences
                        </Badge>
                        <CollapsibleTrigger className="hover:bg-muted rounded-md p-1 focus:outline-none">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </CollapsibleTrigger>
                      </div>
                    </div>
                    <CollapsibleContent>
                      <div className="border-t px-4 py-3">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="mb-2 text-sm font-medium">
                              Related Items:
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {pattern.relatedItems.map((item, i) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="whitespace-nowrap"
                                >
                                  {item}
                                </Badge>
                              ))}
                            </div>

                            {/* Hourly distribution chart for time patterns */}
                            {pattern.type === "time_of_day" &&
                              pattern.details.hourlyDistribution && (
                                <div className="mt-4">
                                  <h4 className="mb-2 text-sm font-medium">
                                    Hourly Distribution:
                                  </h4>
                                  <ResponsiveContainer
                                    width="100%"
                                    height={150}
                                  >
                                    <BarChart
                                      data={
                                        Array.isArray(
                                          pattern.details.hourlyDistribution,
                                        )
                                          ? pattern.details.hourlyDistribution.map(
                                              (
                                                count: number,
                                                hour: number,
                                              ) => ({
                                                hour:
                                                  hour === 0
                                                    ? "12am"
                                                    : hour === 12
                                                      ? "12pm"
                                                      : hour < 12
                                                        ? `${hour}am`
                                                        : `${hour - 12}pm`,
                                                count,
                                              }),
                                            )
                                          : []
                                      }
                                      margin={{
                                        top: 5,
                                        right: 5,
                                        bottom: 20,
                                        left: 5,
                                      }}
                                    >
                                      <XAxis
                                        dataKey="hour"
                                        scale="band"
                                        tick={{ fontSize: 10 }}
                                        interval={1}
                                        angle={-45}
                                        textAnchor="end"
                                        height={40}
                                      />
                                      <YAxis hide />
                                      <Tooltip
                                        formatter={(value) => [
                                          `${value} skips`,
                                          "Count",
                                        ]}
                                      />
                                      <Bar
                                        dataKey="count"
                                        fill="#8884d8"
                                        radius={[4, 4, 0, 0]}
                                      />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                          </div>
                          <div>
                            <h4 className="mb-2 text-sm font-medium">
                              Pattern Details:
                            </h4>
                            <div className="space-y-1">
                              {Object.entries(pattern.details)
                                .filter(
                                  ([key]) =>
                                    ![
                                      "hourlyDistribution",
                                      "dayOfWeekDistribution",
                                      "peakHours",
                                    ].includes(key),
                                )
                                .map(([key, value]) => {
                                  // Skip complex objects from details
                                  if (
                                    typeof value === "object" &&
                                    value !== null
                                  )
                                    return null;

                                  const formattedKey = key
                                    .replace(/([A-Z])/g, " $1")
                                    .replace(/^./, (str) => str.toUpperCase());

                                  return (
                                    <div key={key} className="text-sm">
                                      <span className="font-medium">
                                        {formattedKey}:
                                      </span>{" "}
                                      <span className="text-muted-foreground">
                                        {typeof value === "number" &&
                                        !Number.isInteger(value)
                                          ? formatPercent(value)
                                          : typeof value === "string"
                                            ? value
                                            : typeof value === "number"
                                              ? value.toString()
                                              : typeof value === "boolean"
                                                ? value.toString()
                                                : ""}
                                      </span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SkipPatternsTab;
