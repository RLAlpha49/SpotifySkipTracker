/**
 * @packageDocumentation
 * @module OverviewTab
 * @description Statistics Overview Dashboard Component
 *
 * Provides a high-level summary of the user's listening statistics through
 * a collection of metric cards displaying key data points. This component
 * serves as the main landing view for the statistics section, offering
 * a quick snapshot of listening habits and patterns.
 *
 * Features:
 * - Grid layout of key metric cards with responsive design
 * - Visual indicators with color coding based on metric values
 * - Loading skeleton state during data retrieval
 * - Empty state handling for new users
 * - Hover effects for improved visual engagement
 * - Contextual icons for enhanced readability
 *
 * This component consolidates the most important statistics in a single view,
 * allowing users to quickly assess their listening patterns before diving
 * into more detailed analysis in the specialized tabs.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatisticsData } from "@/types/statistics";
import {
  Calendar,
  Clock,
  Laptop,
  Music,
  PlayCircle,
  Repeat,
  SkipForward,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";
import React from "react";
import { NoDataMessage } from "./NoDataMessage";
import { formatPercent } from "./utils";

/**
 * Props for the OverviewTab component
 *
 * @property loading - Whether statistics data is currently being loaded
 * @property statistics - Raw statistics data object or null if unavailable
 * @property statsSummary - Processed summary of key statistics for display
 * @property statsSummary.totalListeningTime - Total listening time in human-readable format
 * @property statsSummary.skipRate - Formatted skip rate percentage
 * @property statsSummary.skipRateValue - Skip rate as a decimal value (0-1)
 * @property statsSummary.discoveryRate - Formatted percentage of new artists discovered
 * @property statsSummary.totalTracks - Total number of tracks played
 * @property statsSummary.totalArtists - Total number of unique artists listened to
 * @property statsSummary.mostActiveDay - Day of week with most listening activity
 * @property statsSummary.peakListeningHour - Hour of day with most listening activity
 * @property statsSummary.recentTracksCount - Number of tracks played recently
 * @property statsSummary.recentSkipCount - Number of tracks skipped recently
 * @property statsSummary.recentListeningTime - Recent listening time in human-readable format
 */
interface OverviewTabProps {
  loading: boolean;
  statistics: StatisticsData | null;
  statsSummary: {
    totalListeningTime: string;
    skipRate: string;
    skipRateValue: number;
    discoveryRate: string;
    totalTracks: number;
    totalArtists: number;
    mostActiveDay: string;
    peakListeningHour: string;
    recentTracksCount: number;
    recentSkipCount: number;
    recentListeningTime: string;
  } | null;
}

/**
 * Statistics overview dashboard with key metrics
 *
 * Renders a grid of metric cards displaying key statistics about the user's
 * listening habits. Each card focuses on a specific aspect of listening behavior,
 * such as skip rate, artist diversity, or listening duration.
 *
 * The component handles multiple states:
 * - Loading state with skeleton placeholders
 * - Empty state with guidance for new users
 * - Populated state with formatted statistics in visually engaging cards
 *
 * Visual elements include color-coded indicators, progress bars, and iconography
 * to help users quickly interpret the data and identify patterns in their
 * listening behavior.
 *
 * @param props - Component properties
 * @param props.loading - Whether data is being loaded
 * @param props.statistics - Complete statistics data object
 * @param props.statsSummary - Processed summary statistics for display
 * @returns React component with statistics overview dashboard
 * @source
 */
export function OverviewTab({
  loading,
  statistics,
  statsSummary,
}: OverviewTabProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array(9)
          .fill(0)
          .map((_, i) => (
            <Card
              key={i}
              className="border-border/40 overflow-hidden transition-all duration-200"
            >
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent className="pt-4">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="mt-2 h-4 w-36" />
              </CardContent>
            </Card>
          ))}
      </div>
    );
  }

  if (!statistics) {
    return (
      <NoDataMessage message="No statistics data available yet. Keep listening to music to generate insights!" />
    );
  }

  /**
   * Determines progress bar color based on skip rate value
   *
   * Maps skip rate values to appropriate colors for visual feedback:
   * - Low values (< 30%): Green to indicate healthy listening
   * - Medium values (30-50%): Amber to indicate moderate skipping
   * - High values (> 50%): Red to indicate frequent skipping
   *
   * @param value - Skip rate as a decimal (0-1)
   * @returns CSS class string for the progress bar color
   */
  const getProgressColor = (value: number) => {
    if (value < 0.3) return "bg-emerald-500";
    if (value < 0.5) return "bg-amber-500";
    return "bg-rose-500";
  };

  /**
   * Determines text color for repeat listening rate
   *
   * Maps repeat listening rate values to appropriate colors:
   * - Low values (< 15%): Default muted color
   * - Medium values (15-30%): Amber to indicate moderate repetition
   * - High values (> 30%): Green to indicate significant repetition
   *
   * @param value - Repeat rate as a decimal (0-1)
   * @returns CSS class string for the text color
   */
  const getRepeatRateColor = (value: number) => {
    if (value < 0.15) return "text-muted-foreground";
    if (value < 0.3) return "text-amber-500";
    return "text-emerald-500";
  };

  /**
   * Determines text color for artist discovery rate
   *
   * Maps discovery rate percentage to appropriate colors:
   * - Low values (< 10%): Default muted color
   * - Medium values (10-25%): Amber to indicate moderate discovery
   * - High values (> 25%): Green to indicate significant discovery
   *
   * @param value - Discovery rate as a percentage string
   * @returns CSS class string for the text color
   */
  const getDiscoveryColor = (value: string) => {
    const numValue = parseFloat(value);
    if (numValue < 10) return "text-muted-foreground";
    if (numValue < 25) return "text-amber-500";
    return "text-emerald-500";
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Listening Time Card */}
      <Card className="border-primary/20 hover:border-primary/30 group overflow-hidden transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="text-primary h-4 w-4" />
            Total Listening Time
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-3xl font-bold tracking-tight">
            {statsSummary?.totalListeningTime}
          </div>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
            <Music className="h-3.5 w-3.5" />
            {statistics.totalUniqueTracks} unique tracks played
          </p>
        </CardContent>
      </Card>

      {/* Skip Rate Card */}
      <Card className="group overflow-hidden transition-all duration-200 hover:border-rose-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <SkipForward className="h-4 w-4 text-rose-500" />
            Skip Rate
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-3xl font-bold tracking-tight">
            {statsSummary?.skipRate}
          </div>
          <Progress
            value={
              statsSummary?.skipRateValue ? statsSummary.skipRateValue * 100 : 0
            }
            className={`mt-2 h-2 ${getProgressColor(statsSummary?.skipRateValue || 0)}`}
          />
        </CardContent>
      </Card>

      {/* Artists Card */}
      <Card className="group overflow-hidden transition-all duration-200 hover:border-blue-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <User className="h-4 w-4 text-blue-500" />
            Artists
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-3xl font-bold tracking-tight">
            {statistics.totalUniqueArtists}
          </div>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            Discovery rate:{" "}
            <span
              className={getDiscoveryColor(statsSummary?.discoveryRate || "0%")}
            >
              {statsSummary?.discoveryRate}
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Most Active Day Card */}
      <Card className="group overflow-hidden transition-all duration-200 hover:border-violet-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4 text-violet-500" />
            Most Active Day
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-3xl font-bold tracking-tight">
            {statsSummary?.mostActiveDay}
          </div>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5" />
            Peak hour: {statsSummary?.peakListeningHour}
          </p>
        </CardContent>
      </Card>

      {/* Today's Listening Card */}
      <Card className="group overflow-hidden transition-all duration-200 hover:border-emerald-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <PlayCircle className="h-4 w-4 text-emerald-500" />
            Today&apos;s Listening
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-3xl font-bold tracking-tight">
            {statsSummary?.recentListeningTime}
          </div>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
            <TrendingUp className="h-3.5 w-3.5" />
            {statsSummary?.recentTracksCount} tracks (
            {statsSummary?.recentSkipCount} skipped)
          </p>
        </CardContent>
      </Card>

      {/* Tracks Card */}
      <Card className="group overflow-hidden transition-all duration-200 hover:border-amber-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Music className="h-4 w-4 text-amber-500" />
            Tracks
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-3xl font-bold tracking-tight">
            {statistics.totalUniqueTracks}
          </div>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
            <User className="h-3.5 w-3.5" />
            {Object.keys(statistics.artistMetrics).length} artists tracked
          </p>
        </CardContent>
      </Card>

      {/* Repeat Rate Card */}
      <Card className="group overflow-hidden transition-all duration-200 hover:border-cyan-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Repeat className="h-4 w-4 text-cyan-500" />
            Repeat Rate
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div
            className={`text-3xl font-bold tracking-tight ${getRepeatRateColor(statistics.repeatListeningRate || 0)}`}
          >
            {formatPercent(statistics.repeatListeningRate || 0)}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Tracks repeated within sessions
          </p>
        </CardContent>
      </Card>

      {/* Device Usage Card */}
      <Card className="group overflow-hidden transition-all duration-200 hover:border-indigo-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Laptop className="h-4 w-4 text-indigo-500" />
            Device Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-3xl font-bold tracking-tight">
            {Object.keys(statistics.deviceMetrics || {}).length}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">Devices tracked</p>
        </CardContent>
      </Card>
    </div>
  );
}
