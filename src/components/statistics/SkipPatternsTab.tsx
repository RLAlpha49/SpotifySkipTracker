import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StatisticsData } from "@/types/statistics";
import { NoDataMessage } from "./NoDataMessage";
import { getHourLabel } from "./utils";

interface SkipPatternsTabProps {
  loading: boolean;
  statistics: StatisticsData | null;
}

export function SkipPatternsTab({ loading, statistics }: SkipPatternsTabProps) {
  if (loading) {
    return <Skeleton className="h-[400px] w-full" />;
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

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Sequential Skip Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(statistics.skipPatterns || {})
              .sort(
                (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime(),
              )
              .slice(0, 5)
              .map(([date, data]) => {
                const formattedDate = new Date(date).toLocaleDateString(
                  undefined,
                  {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  },
                );
                const maxSkips = data.maxConsecutiveSkips || 1;

                return (
                  <div key={date} className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span>{formattedDate}</span>
                      <span>{data.skipSequenceCount || 0} sequences</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex h-10 items-end gap-1">
                          {[...Array(Math.min(maxSkips, 10))].map((_, i) => (
                            <div
                              key={i}
                              className="bg-primary w-full rounded-t-sm"
                              style={{
                                height: `${((i + 1) / maxSkips) * 100}%`,
                              }}
                            ></div>
                          ))}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div>Max: {maxSkips} skips</div>
                        <div className="text-muted-foreground text-xs">
                          Avg: {(data.avgSkipsPerSequence || 0).toFixed(1)} per
                          sequence
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consecutive Non-Skip Streaks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(statistics.sessions || [])
              .filter(
                (session) =>
                  session.longestNonSkipStreak &&
                  session.longestNonSkipStreak > 0,
              )
              .sort(
                (a, b) =>
                  (b.longestNonSkipStreak || 0) - (a.longestNonSkipStreak || 0),
              )
              .slice(0, 5)
              .map((session) => {
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
                    ? (session.longestNonSkipStreak / session.trackIds.length) *
                      100
                    : 0;

                return (
                  <div key={session.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{date}</span>
                      <span>{session.longestNonSkipStreak || 0} tracks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Progress value={percentage} className="h-2" />
                      </div>
                      <div className="w-32 text-right text-xs">
                        {percentage.toFixed(0)}% of session
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="mt-6 text-center text-sm">
            <p>
              Your record:{" "}
              {(statistics.sessions || []).reduce(
                (max, session) =>
                  Math.max(max, session.longestNonSkipStreak || 0),
                0,
              )}{" "}
              tracks in a row without skipping
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>High Skip Rate Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-center">
            <p className="text-muted-foreground text-sm">
              Times of day when you&apos;re most likely to skip tracks
            </p>
          </div>
          <div className="flex justify-center">
            <div className="relative h-20 w-full max-w-2xl">
              <div className="absolute top-0 left-0 h-full w-full rounded-md bg-gray-100 dark:bg-gray-800"></div>
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
                    className="absolute top-0 h-full bg-red-400 opacity-70 dark:bg-red-700"
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
                ))}
              <div className="text-muted-foreground absolute bottom-full flex w-full justify-between pb-1 text-xs">
                <span>Higher skip probability</span>
              </div>
              <div className="text-muted-foreground absolute top-full flex w-full justify-between pt-6 text-xs">
                <span>12am</span>
                <span>6am</span>
                <span>12pm</span>
                <span>6pm</span>
                <span>12am</span>
              </div>
              <div className="absolute top-full flex w-full justify-start pt-2 text-xs text-red-600 dark:text-red-400">
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
                        className="absolute"
                        style={{
                          left: `${(hour / 24) * 100}%`,
                          transform: "translateX(-50%)",
                        }}
                      >
                        {getHourLabel(hour)}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
