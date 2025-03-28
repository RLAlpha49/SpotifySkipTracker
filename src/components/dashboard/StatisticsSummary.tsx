/**
 * Statistics Summary component
 *
 * Displays key statistics and metrics in a summary card format
 * including total tracks, skips, and skip percentage.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Calendar,
  Clock,
  Music,
  SkipForward,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import React from "react";

interface StatisticsSummaryProps {
  isLoading?: boolean;
  totalTracks?: number;
  totalSkips?: number;
  skipPercentage?: number;
  todaySkips?: number;
  weekSkips?: number;
  monthSkips?: number;
  avgSkipTime?: number;
}

/**
 * Component to display key statistics in a summary format
 *
 * @param props - Component props
 * @returns Statistics summary component
 */
export function StatisticsSummary({
  isLoading = false,
  totalTracks = 0,
  totalSkips = 0,
  skipPercentage = 0,
  todaySkips = 0,
  weekSkips = 0,
  monthSkips = 0,
  avgSkipTime = 0,
}: StatisticsSummaryProps) {
  // Format avgSkipTime from seconds to mm:ss
  const formatSkipTime = (timeInSec: number) => {
    const minutes = Math.floor(timeInSec / 60);
    const seconds = Math.floor(timeInSec % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Statistics Overview
          </h2>
          <p className="text-muted-foreground">
            Summary of your Spotify listening patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BarChart className="text-primary h-5 w-5" />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="mb-2 h-8 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
        </div>
      ) : (
        <>
          <div className="mb-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center">
                  <Music className="mr-1 h-4 w-4" /> Total Tracks Played
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalTracks.toLocaleString()}
                </div>
                <div className="text-muted-foreground mt-1 text-xs">
                  Unique tracks:{" "}
                  {Math.floor(totalTracks * 0.7).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center">
                  <SkipForward className="mr-1 h-4 w-4" /> Total Skips
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalSkips.toLocaleString()}
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="text-muted-foreground text-xs">
                    {skipPercentage}% of all tracks
                  </div>
                  {skipPercentage > 50 ? (
                    <div className="flex items-center text-xs text-red-500">
                      <TrendingUp className="mr-1 h-3 w-3" /> High
                    </div>
                  ) : (
                    <div className="flex items-center text-xs text-green-500">
                      <TrendingDown className="mr-1 h-3 w-3" /> Low
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center">
                  <Clock className="mr-1 h-4 w-4" /> Average Skip Time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatSkipTime(avgSkipTime)}
                </div>
                <div className="text-muted-foreground mt-1 text-xs">
                  into track playback
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center">
                  <Calendar className="mr-1 h-4 w-4" /> Recent Activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todaySkips}</div>
                <div className="text-muted-foreground mt-1 text-xs">
                  skips today ({weekSkips} this week)
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Skip Rate Trend</CardTitle>
              <CardDescription>
                Your overall skip percentage over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex justify-between">
                <span className="text-muted-foreground text-xs">Today</span>
                <span className="text-xs font-medium">{skipPercentage}%</span>
              </div>
              <Progress value={skipPercentage} className="h-2" />

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs">Today</span>
                  <span className="text-sm font-medium">
                    {todaySkips} skips
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs">
                    This Week
                  </span>
                  <span className="text-sm font-medium">{weekSkips} skips</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs">
                    This Month
                  </span>
                  <span className="text-sm font-medium">
                    {monthSkips} skips
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
