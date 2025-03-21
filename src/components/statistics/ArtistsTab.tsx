import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StatisticsData } from "@/types/statistics";
import { NoDataMessage } from "./NoDataMessage";
import { formatPercent, formatTime } from "./utils";

interface ArtistsTabProps {
  loading: boolean;
  statistics: StatisticsData | null;
}

export function ArtistsTab({ loading, statistics }: ArtistsTabProps) {
  if (loading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (!statistics || Object.keys(statistics.artistMetrics).length === 0) {
    return (
      <NoDataMessage message="No artist data available yet. Keep listening to music to generate insights!" />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Top Artists by Listening Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(statistics.artistMetrics)
              .sort((a, b) => b[1].listeningTimeMs - a[1].listeningTimeMs)
              .slice(0, 10)
              .map(([artistId, data]) => {
                const maxTime = Math.max(
                  ...Object.values(statistics.artistMetrics).map(
                    (a) => a.listeningTimeMs,
                  ),
                );
                const percentage =
                  maxTime > 0 ? (data.listeningTimeMs / maxTime) * 100 : 0;

                return (
                  <div key={artistId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{data.name}</span>
                      <span>{formatTime(data.listeningTimeMs)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Progress value={percentage} className="h-2" />
                      </div>
                      <div className="w-32 text-right text-xs">
                        {data.tracksPlayed} plays /{" "}
                        {formatPercent(data.skipRate)} skipped
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
          <CardTitle>Artists with Highest Skip Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(statistics.artistMetrics)
              .filter(([, data]) => data.tracksPlayed >= 1)
              .sort((a, b) => b[1].skipRate - a[1].skipRate)
              .slice(0, 8)
              .map(([artistId, data]) => (
                <div
                  key={artistId}
                  className="flex items-center justify-between"
                >
                  <div className="mr-2 truncate">{data.name}</div>
                  <div className="font-mono text-sm">
                    {formatPercent(data.skipRate)}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Artists with Lowest Skip Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(statistics.artistMetrics)
              .filter(([, data]) => data.tracksPlayed >= 1)
              .sort((a, b) => a[1].skipRate - b[1].skipRate)
              .slice(0, 8)
              .map(([artistId, data]) => (
                <div
                  key={artistId}
                  className="flex items-center justify-between"
                >
                  <div className="mr-2 truncate">{data.name}</div>
                  <div className="font-mono text-sm">
                    {formatPercent(data.skipRate)}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4 md:col-span-2">
        <CardHeader>
          <CardTitle>New Artist Discoveries</CardTitle>
        </CardHeader>
        <CardContent>
          {!statistics.recentDiscoveries ||
          statistics.recentDiscoveries.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No new artist discoveries in the last 30 days.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {statistics.recentDiscoveries
                .filter(
                  (id) =>
                    statistics.artistMetrics && statistics.artistMetrics[id],
                )
                .slice(0, 8)
                .map((artistId) => {
                  const artist = statistics.artistMetrics[artistId];
                  return (
                    <div key={artistId} className="bg-muted/40 rounded-lg p-4">
                      <div className="truncate font-medium">{artist.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {artist.tracksPlayed} tracks played
                      </div>
                      <div className="mt-1 text-xs">
                        Skip rate: {formatPercent(artist.skipRate)}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
          <div className="mt-4 text-center text-sm font-medium">
            Discovery rate: {formatPercent(statistics.discoveryRate || 0)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
