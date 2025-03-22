import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { SkipForward, Clock, Calendar, Music, Info } from "lucide-react";
import { StatisticsData } from "@/types/statistics";
import { NoDataMessage } from "./NoDataMessage";
import { formatPercent, getDayName, getHourLabel } from "./utils";

interface ListeningPatternsTabProps {
  loading: boolean;
  statistics: StatisticsData | null;
}

export function ListeningPatternsTab({
  loading,
  statistics,
}: ListeningPatternsTabProps) {
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

  // Function to determine progress bar color based on skip rate
  const getSkipRateColor = (value: number) => {
    if (value < 0.3) return "bg-emerald-500";
    if (value < 0.5) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="group overflow-hidden transition-all duration-200 hover:border-rose-200 hover:shadow-md md:row-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <SkipForward className="h-4 w-4 text-rose-500" />
            Skip Rate by Artist (Top 20)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-muted-foreground mb-4 flex items-center gap-1 text-xs">
            <Info className="h-3.5 w-3.5" />
            <span>Artists with higher skip rates appear at the top</span>
          </div>
          <div className="space-y-4">
            {Object.entries(statistics.artistMetrics)
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
              .map(([artistId, data]) => (
                <div key={artistId} className="flex items-center gap-3">
                  <div
                    className="w-32 min-w-32 truncate font-medium"
                    title={data.name}
                  >
                    {data.name}
                  </div>
                  <div className="flex-1">
                    <Progress
                      value={data.skipRate * 100}
                      className={`h-2 ${getSkipRateColor(data.skipRate)}`}
                    />
                  </div>
                  <div className="w-16 text-right text-sm font-semibold">
                    {formatPercent(data.skipRate)}
                  </div>
                  <div className="text-muted-foreground flex w-16 items-center justify-end gap-1 text-right text-xs">
                    <Music className="h-3 w-3" />
                    {data.tracksPlayed}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card className="hover:border-primary/30 group overflow-hidden transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="text-primary h-4 w-4" />
            Listening Time Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-muted-foreground mb-4 flex items-center justify-center gap-1 text-xs">
            <Clock className="h-3.5 w-3.5" />
            <span>Time of day when you listen to music</span>
          </div>
          <div className="mt-5 space-y-3">
            {/* Group data in 2-hour blocks */}
            {Array.from({ length: 12 }, (_, i) => i * 2).map((hour) => {
              // Combine current hour with next hour (e.g., 2-4 AM)
              const currentHourCount = statistics.hourlyDistribution[hour] || 0;
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
        </CardContent>
      </Card>

      <Card className="group overflow-hidden transition-all duration-200 hover:border-violet-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4 text-violet-500" />
            Weekly Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-muted-foreground mb-4 flex items-center justify-center gap-1 text-xs">
            <Calendar className="h-3.5 w-3.5" />
            <span>Days of the week when you listen to music</span>
          </div>
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
        </CardContent>
      </Card>
    </div>
  );
}
