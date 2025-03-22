import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SkipForward,
  Clock,
  PlayCircle,
  Repeat,
  Check,
  BarChart,
  Disc,
} from "lucide-react";
import { StatisticsData } from "@/types/statistics";
import { NoDataMessage } from "./NoDataMessage";
import { formatPercent } from "./utils";

interface TracksTabProps {
  loading: boolean;
  statistics: StatisticsData | null;
}

export function TracksTab({ loading, statistics }: TracksTabProps) {
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

  // Function to determine progress bar color based on completion percentage
  const getCompletionColor = (completion: number) => {
    if (completion > 90) return "bg-emerald-500";
    if (completion > 70) return "bg-amber-500";
    return "bg-primary";
  };

  // Function to determine text color based on skip rate
  const getSkipRateColor = (skipRate: number) => {
    if (skipRate < 0.2) return "text-emerald-500";
    if (skipRate < 0.5) return "text-amber-500";
    return "text-rose-500";
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="hover:border-primary/30 group overflow-hidden transition-all duration-200 hover:shadow-md md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <BarChart className="text-primary h-4 w-4" />
            Most Played Tracks
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
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
