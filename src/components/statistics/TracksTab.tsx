import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StatisticsData } from "@/types/statistics";
import { NoDataMessage } from "./NoDataMessage";
import { formatPercent } from "./utils";

interface TracksTabProps {
  loading: boolean;
  statistics: StatisticsData | null;
}

export function TracksTab({ loading, statistics }: TracksTabProps) {
  if (loading) {
    return <Skeleton className="h-[400px] w-full" />;
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

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Most Played Tracks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(statistics.trackMetrics || {})
              .sort((a, b) => b[1].playCount - a[1].playCount)
              .slice(0, 10)
              .map(([trackId, data]) => {
                const completionPercentage = data.avgCompletionPercent || 0;

                return (
                  <div key={trackId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="max-w-[70%] truncate font-medium">
                        {data.name} - {data.artistName}
                      </span>
                      <span>{data.playCount} plays</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Progress
                          value={completionPercentage}
                          className="h-2"
                        />
                      </div>
                      <div className="w-32 text-right text-xs">
                        {completionPercentage.toFixed(0)}% completion
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
          <CardTitle>Most Skipped Tracks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(statistics.trackMetrics || {})
              .filter(([, data]) => data.playCount >= 1 && data.skipCount > 0)
              .sort(
                (a, b) =>
                  b[1].skipCount / b[1].playCount -
                  a[1].skipCount / a[1].playCount,
              )
              .slice(0, 8)
              .map(([trackId, data]) => {
                const skipRate = data.skipCount / data.playCount;

                return (
                  <div key={trackId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="max-w-[70%] truncate">{data.name}</span>
                      <span>{formatPercent(skipRate)}</span>
                    </div>
                    <div className="text-muted-foreground truncate text-xs">
                      {data.artistName} • Played {data.playCount} times
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recently Played</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(statistics.trackMetrics || {})
              .sort(
                (a, b) =>
                  new Date(b[1].lastPlayed).getTime() -
                  new Date(a[1].lastPlayed).getTime(),
              )
              .slice(0, 8)
              .map(([trackId, data]) => {
                const date = new Date(data.lastPlayed);
                const formattedDate = date.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                });
                const formattedTime = date.toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div key={trackId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="max-w-[70%] truncate">{data.name}</span>
                      <span>
                        {formattedDate}, {formattedTime}
                      </span>
                    </div>
                    <div className="text-muted-foreground truncate text-xs">
                      {data.artistName} •{" "}
                      {data.hasBeenRepeated ? "Repeated" : "Single play"}
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
