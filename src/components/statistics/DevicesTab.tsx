import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StatisticsData } from "@/types/statistics";
import { NoDataMessage } from "./NoDataMessage";
import { formatPercent, formatTime, getHourLabel } from "./utils";

interface DevicesTabProps {
  loading: boolean;
  statistics: StatisticsData | null;
}

export function DevicesTab({ loading, statistics }: DevicesTabProps) {
  if (loading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (
    !statistics ||
    !statistics.deviceMetrics ||
    Object.keys(statistics.deviceMetrics).length === 0
  ) {
    return (
      <NoDataMessage message="No device data available yet. Keep listening to music on different devices to generate insights!" />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Device Usage Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(statistics.deviceMetrics || {})
              .sort((a, b) => b[1].listeningTimeMs - a[1].listeningTimeMs)
              .map(([deviceId, data]) => {
                const maxTime = Math.max(
                  ...Object.values(statistics.deviceMetrics || {}).map(
                    (d) => d.listeningTimeMs,
                  ),
                );
                const percentage =
                  maxTime > 0 ? (data.listeningTimeMs / maxTime) * 100 : 0;

                return (
                  <div key={deviceId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">
                        {data.deviceName} ({data.deviceType})
                      </span>
                      <span>{formatTime(data.listeningTimeMs)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Progress value={percentage} className="h-2" />
                      </div>
                      <div className="w-32 text-right text-xs">
                        {data.tracksPlayed} tracks •{" "}
                        {formatPercent(data.skipRate)} skipped
                      </div>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Peak usage: {getHourLabel(data.peakUsageHour || 0)}
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skip Rates by Device</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(statistics.deviceMetrics || {})
              .sort((a, b) => b[1].skipRate - a[1].skipRate)
              .map(([deviceId, data]) => (
                <div key={deviceId} className="flex items-center gap-4">
                  <div
                    className="w-32 truncate"
                    title={`${data.deviceName} (${data.deviceType})`}
                  >
                    {data.deviceName}
                  </div>
                  <div className="flex-1">
                    <Progress
                      value={(data.skipRate || 0) * 100}
                      className="h-2"
                    />
                  </div>
                  <div className="w-16 text-right text-sm">
                    {formatPercent(data.skipRate || 0)}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Device Usage by Time of Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(statistics.deviceMetrics || {})
              .slice(0, 3) // Top 3 devices
              .map(([deviceId, data]) => (
                <div key={deviceId} className="mb-4">
                  <h4 className="mb-2 text-sm font-medium">
                    {data.deviceName}
                  </h4>
                  <div className="relative h-8 w-full rounded-md bg-gray-100 dark:bg-gray-800">
                    <div
                      className="bg-primary absolute top-0 h-full rounded-md opacity-70"
                      style={{
                        left: `${((data.peakUsageHour || 0) / 24) * 100}%`,
                        width: "8.33%", // 2 hours width
                      }}
                    ></div>
                    {/* Time markers */}
                    <div className="text-muted-foreground absolute top-full flex w-full justify-between pt-1 text-xs">
                      <span>12am</span>
                      <span>6am</span>
                      <span>12pm</span>
                      <span>6pm</span>
                      <span>12am</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
