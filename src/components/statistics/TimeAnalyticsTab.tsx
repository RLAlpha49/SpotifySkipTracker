import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  Calendar,
  LineChart,
  BarChart3,
  AlarmClock,
  Timer,
  PlayCircle,
} from "lucide-react";
import { StatisticsData } from "@/types/statistics";
import { NoDataMessage } from "./NoDataMessage";
import { formatPercent, formatTime } from "./utils";

interface TimeAnalyticsTabProps {
  loading: boolean;
  statistics: StatisticsData | null;
}

export function TimeAnalyticsTab({
  loading,
  statistics,
}: TimeAnalyticsTabProps) {
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

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="hover:border-primary/30 group overflow-hidden transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="text-primary h-4 w-4" />
            Monthly Listening Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            {Object.entries(statistics.monthlyMetrics)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([month, data]) => {
                const displayMonth = new Date(month + "-01").toLocaleDateString(
                  undefined,
                  {
                    month: "long",
                    year: "numeric",
                  },
                );
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
                          <PlayCircle className="h-3 w-3" />
                          <span>{data.tracksPlayed}</span>
                        </span>
                      </div>
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
            <AlarmClock className="h-4 w-4 text-violet-500" />
            Daily Listening (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
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
                        <PlayCircle className="h-3 w-3" />
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
                        <Timer className="text-muted-foreground h-3 w-3" />
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
        </CardContent>
      </Card>

      <Card className="group mt-0 overflow-hidden transition-all duration-200 hover:border-cyan-200 hover:shadow-md md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <LineChart className="h-4 w-4 text-cyan-500" />
            Listening Trends (Last 14 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div>
                <div className="mb-10 flex items-center gap-2 text-sm font-medium">
                  <BarChart3 className="h-4 w-4 text-rose-500" />
                  Skip Rate Trend
                </div>
                <div className="flex h-[180px] items-end justify-between gap-1">
                  {(statistics.recentSkipRateTrend || Array(14).fill(0)).map(
                    (rate, index) => {
                      const barHeight = 160; // Fixed height for visualization area
                      const minBarHeight = 4; // Minimum visible height
                      const barHeightPx =
                        rate > 0
                          ? Math.max(Math.floor(rate * barHeight), minBarHeight)
                          : minBarHeight;

                      const date = new Date();
                      date.setDate(date.getDate() - (13 - index));
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
              </div>

              <div>
                <div className="mb-10 flex items-center gap-2 text-sm font-medium">
                  <Timer className="h-4 w-4 text-emerald-500" />
                  Listening Time Trend
                </div>
                <div className="flex h-[180px] items-end justify-between gap-1">
                  {(
                    statistics.recentListeningTimeTrend || Array(14).fill(0)
                  ).map((time, _index) => {
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

                    const date = new Date();
                    date.setDate(date.getDate() - (13 - _index));
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
                        key={_index}
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
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
