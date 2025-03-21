import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
      <NoDataMessage message="No listening pattern data available yet. Keep listening to music to generate insights!" />
    );
  }

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Skip Rate by Artist (Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(statistics.artistMetrics)
              .filter(([, data]) => data.tracksPlayed >= 1)
              .sort((a, b) => b[1].skipRate - a[1].skipRate)
              .slice(0, 10)
              .map(([artistId, data]) => (
                <div key={artistId} className="flex items-center gap-4">
                  <div className="w-32 truncate" title={data.name}>
                    {data.name}
                  </div>
                  <div className="flex-1">
                    <Progress value={data.skipRate * 100} className="h-2" />
                  </div>
                  <div className="w-16 text-right text-sm">
                    {formatPercent(data.skipRate)}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Listening Time Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-center">
              <p className="text-muted-foreground text-sm">
                Time of day when you listen to music
              </p>
            </div>
            <div className="space-y-2">
              {statistics.hourlyDistribution.map((count, hour) => {
                const maxCount = Math.max(...statistics.hourlyDistribution);
                const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

                // Only show non-zero hours and group by 4 hours
                if (hour % 4 === 0 || percentage > 10) {
                  return (
                    <div key={hour} className="flex items-center gap-2">
                      <div className="w-12 text-xs">{getHourLabel(hour)}</div>
                      <div className="flex-1">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="w-8 text-right text-xs">{count}</div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-center">
              <p className="text-muted-foreground text-sm">
                Days of the week when you listen to music
              </p>
            </div>
            <div className="space-y-2">
              {statistics.dailyDistribution.map((count, day) => {
                const maxCount = Math.max(...statistics.dailyDistribution);
                const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

                return (
                  <div key={day} className="flex items-center gap-2">
                    <div className="w-24 text-xs">{getDayName(day)}</div>
                    <div className="flex-1">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="w-8 text-right text-xs">{count}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
