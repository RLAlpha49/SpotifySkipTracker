import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
        {Array(2)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[200px] w-full" />
              </CardContent>
            </Card>
          ))}
      </div>
    );
  }

  if (!statistics) {
    return (
      <NoDataMessage message="No time analytics data available yet. Keep listening to music to generate insights!" />
    );
  }

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Monthly Listening Activity</CardTitle>
        </CardHeader>
        <CardContent>
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
                const maxMetrics = Math.max(
                  ...Object.values(statistics.monthlyMetrics).map(
                    (m) => m.tracksPlayed,
                  ),
                );
                const percentage =
                  maxMetrics > 0 ? (data.tracksPlayed / maxMetrics) * 100 : 0;

                return (
                  <div key={month} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{displayMonth}</span>
                      <span>{formatTime(data.listeningTimeMs)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Progress value={percentage} className="h-2" />
                      </div>
                      <div className="w-16 text-right text-xs">
                        {data.tracksPlayed} tracks
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
          <CardTitle>Daily Listening (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
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

                return (
                  <div key={date} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{displayDate}</span>
                      <span>{data.tracksPlayed} tracks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                          <div
                            className="bg-primary h-full"
                            style={{
                              width: `${100 - skipPercentage}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="w-32 text-right text-xs">
                        {formatTime(data.listeningTimeMs)} /{" "}
                        {formatPercent(data.tracksSkipped / data.tracksPlayed)}{" "}
                        skipped
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="mt-4 md:col-span-2">
          <CardHeader>
            <CardTitle>Listening Trends (Last 14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div>
                  <div className="mb-8 text-sm">Skip Rate Trend</div>
                  <div className="flex h-[180px] items-end justify-between gap-1">
                    {(statistics.recentSkipRateTrend || Array(14).fill(0)).map(
                      (rate, index) => {
                        const barHeight = 160; // Fixed height for visualization area
                        const minBarHeight = 8; // Minimum visible height
                        const barHeightPx =
                          rate > 0
                            ? Math.max(
                                Math.floor(rate * barHeight),
                                minBarHeight,
                              )
                            : minBarHeight;

                        const date = new Date();
                        date.setDate(date.getDate() - (13 - index));
                        const day = date.getDate();

                        return (
                          <div
                            key={index}
                            className="flex flex-1 flex-col items-center gap-1"
                          >
                            <div className="mb-1 text-xs">
                              {rate > 0 ? `${Math.round(rate * 100)}%` : "-"}
                            </div>
                            <div
                              className="relative w-full overflow-hidden rounded-sm bg-gray-200 dark:bg-gray-800"
                              style={{
                                height: "160px",
                              }} /* Fixed pixel height instead of percentage */
                            >
                              <div
                                className={`absolute bottom-0 w-full transition-all duration-500 ${
                                  rate > 0
                                    ? "bg-primary"
                                    : "bg-gray-400 dark:bg-gray-600"
                                }`}
                                style={{ height: `${barHeightPx}px` }}
                              ></div>
                            </div>
                            <div className="text-xs">{day}</div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-8 text-sm">Listening Time Trend</div>
                  <div className="flex h-[180px] items-end justify-between gap-1">
                    {(
                      statistics.recentListeningTimeTrend || Array(14).fill(0)
                    ).map((time, _index) => {
                      const maxTime = Math.max(
                        ...(statistics.recentListeningTimeTrend || [1]),
                        1,
                      );

                      const barHeight = 160; // Fixed height for visualization area
                      const minBarHeight = 8; // Minimum visible height
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

                      return (
                        <div
                          key={_index}
                          className="flex flex-1 flex-col items-center gap-1"
                        >
                          <div className="mb-1 text-xs">
                            {time > 0 ? formatTime(time) : "-"}
                          </div>
                          <div
                            className="relative w-full overflow-hidden rounded-sm bg-gray-200 dark:bg-gray-800"
                            style={{
                              height: "160px",
                            }} /* Fixed pixel height instead of percentage */
                          >
                            <div
                              className={`absolute bottom-0 w-full transition-all duration-500 ${
                                time > 0
                                  ? "bg-green-500"
                                  : "bg-gray-400 dark:bg-gray-600"
                              }`}
                              style={{ height: `${barHeightPx}px` }}
                            ></div>
                          </div>
                          <div className="text-xs">{day}</div>
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
    </>
  );
}
