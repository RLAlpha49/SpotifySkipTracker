import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SkipForward,
  Calendar,
  Clock,
  BarChart3,
  History,
  Zap,
  CheckCircle,
  AlertTriangle,
  Sunrise,
  Sunset,
  Sun,
  Moon,
} from "lucide-react";
import { StatisticsData } from "@/types/statistics";
import { NoDataMessage } from "./NoDataMessage";
import { getHourLabel } from "./utils";

interface SkipPatternsTabProps {
  loading: boolean;
  statistics: StatisticsData | null;
}

export function SkipPatternsTab({ loading, statistics }: SkipPatternsTabProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/40 overflow-hidden transition-all duration-200">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex h-10 items-end gap-1">
                          {Array(6)
                            .fill(0)
                            .map((_, j) => (
                              <Skeleton
                                key={j}
                                className="w-full rounded-t-sm"
                                style={{ height: `${(j + 1) * 15}%` }}
                              />
                            ))}
                        </div>
                      </div>
                      <Skeleton className="h-10 w-20" />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 overflow-hidden transition-all duration-200">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-48" />
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
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                ))}
            </div>
            <div className="mt-6 flex justify-center">
              <Skeleton className="h-4 w-48" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 overflow-hidden transition-all duration-200 md:col-span-2">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="mb-4 flex justify-center">
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-20 w-full rounded-md" />
            <div className="mt-6 flex w-full justify-between pt-1">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-8" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (
    !statistics ||
    !statistics.skipPatterns ||
    Object.keys(statistics.skipPatterns).length === 0
  ) {
    return (
      <NoDataMessage message="No skip pattern data available yet. Keep listening to music to generate insights!" />
    );
  }

  // Function to get time of day icon
  const getTimeIcon = (hour: number) => {
    if (hour >= 5 && hour < 8)
      return <Sunrise className="h-4 w-4 text-amber-500" />;
    if (hour >= 8 && hour < 17)
      return <Sun className="h-4 w-4 text-amber-500" />;
    if (hour >= 17 && hour < 20)
      return <Sunset className="h-4 w-4 text-orange-500" />;
    return <Moon className="h-4 w-4 text-indigo-500" />;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="group overflow-hidden transition-all duration-200 hover:border-rose-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="h-4 w-4 text-rose-500" />
            Sequential Skip Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="relative">
            <ScrollArea className="h-[300px] pr-4">
              <div className="mr-2 space-y-4 pb-1">
                {Object.entries(statistics.skipPatterns || {})
                  .sort(
                    (a, b) =>
                      new Date(b[0]).getTime() - new Date(a[0]).getTime(),
                  )
                  .slice(0, 10)
                  .map(([date, data], index) => {
                    const formattedDate = new Date(date).toLocaleDateString(
                      undefined,
                      {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      },
                    );
                    const maxSkips = data.maxConsecutiveSkips || 1;

                    // Determine text color based on max skips
                    const maxSkipsColor =
                      maxSkips > 5
                        ? "text-rose-500"
                        : maxSkips > 3
                          ? "text-amber-500"
                          : "text-emerald-500";

                    // Determine if this is a recent pattern (top 2)
                    const isRecentPattern = index < 2;

                    return (
                      <div
                        key={date}
                        className="hover:bg-muted/50 space-y-2 rounded-md px-2 py-2 transition-colors"
                      >
                        <div className="flex justify-between text-sm font-medium">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="text-muted-foreground h-3.5 w-3.5" />
                            {formattedDate}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <History className="text-muted-foreground h-3.5 w-3.5" />
                            {data.skipSequenceCount || 0} sequences
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="flex h-10 items-end gap-1">
                              {[...Array(Math.min(maxSkips, 10))].map(
                                (_, i) => {
                                  // Determine color based on skip position
                                  const skipColor =
                                    i < 2
                                      ? "bg-primary/70"
                                      : i < 5
                                        ? "bg-amber-500/70"
                                        : "bg-rose-500/70";

                                  return (
                                    <div
                                      key={i}
                                      className={`${skipColor} w-full rounded-t-sm transition-all duration-200 hover:opacity-100`}
                                      style={{
                                        height: `${((i + 1) / maxSkips) * 100}%`,
                                        opacity: isRecentPattern ? 0.9 : 0.7,
                                      }}
                                    ></div>
                                  );
                                },
                              )}
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <div className="flex items-center gap-1">
                              <span>Max:</span>
                              <span
                                className={`font-semibold ${maxSkipsColor}`}
                              >
                                {maxSkips} skips
                              </span>
                            </div>
                            <div className="text-muted-foreground flex items-center gap-1 text-xs">
                              <span>Avg:</span>
                              <span>
                                {(data.avgSkipsPerSequence || 0).toFixed(1)} per
                                sequence
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <Card className="group overflow-hidden transition-all duration-200 hover:border-emerald-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            Consecutive Non-Skip Streaks
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="relative">
            <ScrollArea className="h-[240px] pr-4">
              <div className="mr-2 space-y-3 pb-1">
                {(statistics.sessions || [])
                  .filter(
                    (session) =>
                      session.longestNonSkipStreak &&
                      session.longestNonSkipStreak > 0,
                  )
                  .sort(
                    (a, b) =>
                      (b.longestNonSkipStreak || 0) -
                      (a.longestNonSkipStreak || 0),
                  )
                  .slice(0, 8)
                  .map((session, index) => {
                    const date = new Date(session.startTime).toLocaleDateString(
                      undefined,
                      {
                        month: "short",
                        day: "numeric",
                      },
                    );
                    const percentage =
                      session.trackIds &&
                      session.trackIds.length > 0 &&
                      session.longestNonSkipStreak
                        ? (session.longestNonSkipStreak /
                            session.trackIds.length) *
                          100
                        : 0;

                    // Determine progress color
                    const progressColor =
                      percentage > 80
                        ? "bg-emerald-500"
                        : percentage > 50
                          ? "bg-amber-500"
                          : "bg-primary";

                    // Determine if this is a top streak (top 2)
                    const isTopStreak = index < 2;

                    return (
                      <div
                        key={session.id}
                        className="hover:bg-muted/50 space-y-1 rounded-md px-2 py-1.5 transition-colors"
                      >
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="text-muted-foreground h-3.5 w-3.5" />
                            {date}
                          </span>
                          <span
                            className={`flex items-center gap-1 ${isTopStreak ? "font-medium text-emerald-500" : ""}`}
                          >
                            <Zap
                              className={`h-3.5 w-3.5 ${isTopStreak ? "text-emerald-500" : "text-muted-foreground"}`}
                            />
                            {session.longestNonSkipStreak || 0} tracks
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <Progress
                              value={percentage}
                              className={`h-2 ${progressColor}`}
                            />
                          </div>
                          <div className="flex w-24 items-center justify-end gap-1 text-right text-xs">
                            <span
                              className={
                                percentage > 80 ? "text-emerald-500" : ""
                              }
                            >
                              {percentage.toFixed(0)}%
                            </span>
                            <span className="text-muted-foreground">
                              of session
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 rounded-md bg-emerald-50 p-2 text-sm dark:bg-emerald-950/30">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span>Your record:</span>
            </span>
            <span className="font-bold text-emerald-500">
              {(statistics.sessions || []).reduce(
                (max, session) =>
                  Math.max(max, session.longestNonSkipStreak || 0),
                0,
              )}
            </span>
            <span>tracks in a row without skipping</span>
          </div>
        </CardContent>
      </Card>

      <Card className="group overflow-hidden transition-all duration-200 hover:border-amber-200 hover:shadow-md md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            High Skip Rate Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="mb-4 text-center">
            <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-sm">
              <Clock className="h-4 w-4" />
              Times of day when you&apos;re most likely to skip tracks
            </p>
          </div>
          <div className="flex justify-center">
            <div className="relative h-24 w-full max-w-2xl">
              <div className="bg-muted/30 absolute left-0 top-0 h-full w-full rounded-md"></div>

              {/* Time marker lines */}
              {[0, 6, 12, 18, 24].map((h) => (
                <div
                  key={h}
                  className="border-border/30 absolute top-0 h-full border-l"
                  style={{ left: `${(h / 24) * 100}%` }}
                ></div>
              ))}

              {/* High skip rate areas */}
              {Object.values(statistics.skipPatterns || {})
                .flatMap((pattern) => pattern.highSkipRateHours || [])
                .reduce((hours, hour) => {
                  if (!hours.includes(hour)) hours.push(hour);
                  return hours;
                }, [] as number[])
                .sort((a, b) => a - b)
                .map((hour) => {
                  // Determine time period classification
                  const timePeriod =
                    hour >= 5 && hour < 12
                      ? "Morning"
                      : hour >= 12 && hour < 17
                        ? "Afternoon"
                        : hour >= 17 && hour < 22
                          ? "Evening"
                          : "Night";

                  const timeColorClass =
                    timePeriod === "Morning"
                      ? "bg-amber-500/70"
                      : timePeriod === "Afternoon"
                        ? "bg-orange-500/70"
                        : timePeriod === "Evening"
                          ? "bg-rose-500/70"
                          : "bg-indigo-500/70";

                  return (
                    <div
                      key={hour}
                      className={`absolute top-0 h-full ${timeColorClass} rounded-md`}
                      style={{
                        left: `${(hour / 24) * 100}%`,
                        width: "4.16%", // 1 hour width
                      }}
                    >
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        title={`High skip rate at ${getHourLabel(hour)}`}
                      ></div>
                    </div>
                  );
                })}

              <div className="text-muted-foreground absolute bottom-full flex w-full justify-between pb-2 text-xs">
                <span className="flex items-center gap-1 font-medium text-rose-500">
                  <SkipForward className="h-3.5 w-3.5" />
                  Higher skip probability
                </span>
              </div>

              {/* Time markers with icons */}
              <div className="text-muted-foreground absolute top-full flex w-full justify-between pt-2 text-xs">
                <span className="flex items-center gap-1">
                  <Moon className="h-3 w-3" />
                  12am
                </span>
                <span className="flex items-center gap-1">
                  <Sunrise className="h-3 w-3" />
                  6am
                </span>
                <span className="flex items-center gap-1">
                  <Sun className="h-3 w-3" />
                  12pm
                </span>
                <span className="flex items-center gap-1">
                  <Sunset className="h-3 w-3" />
                  6pm
                </span>
                <span className="flex items-center gap-1">
                  <Moon className="h-3 w-3" />
                  12am
                </span>
              </div>

              {/* High skip hour labels */}
              <div className="absolute left-0 top-1/2 flex w-full -translate-y-1/2 transform justify-start">
                {Object.values(statistics.skipPatterns || {})
                  .flatMap((pattern) => pattern.highSkipRateHours || [])
                  .reduce((hours, hour) => {
                    if (!hours.includes(hour)) hours.push(hour);
                    return hours;
                  }, [] as number[])
                  .sort((a, b) => a - b)
                  .map((hour, index, arr) => {
                    const prevHour = index > 0 ? arr[index - 1] : -2;
                    if (hour - prevHour <= 1 && index > 0) return null;

                    return (
                      <div
                        key={hour}
                        className="absolute flex items-center justify-center text-xs font-medium text-white"
                        style={{
                          left: `${(hour / 24) * 100}%`,
                          transform: "translateX(-50%)",
                          width: "4.16%",
                        }}
                      ></div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Skip hour details */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {Object.values(statistics.skipPatterns || {})
              .flatMap((pattern) => pattern.highSkipRateHours || [])
              .reduce((hours, hour) => {
                if (!hours.includes(hour)) hours.push(hour);
                return hours;
              }, [] as number[])
              .sort((a, b) => a - b)
              .map((hour) => (
                <div
                  key={hour}
                  className="bg-muted/50 border-border/30 flex items-center gap-1 rounded-full border px-2 py-1 text-xs"
                >
                  {getTimeIcon(hour)}
                  {getHourLabel(hour)}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
