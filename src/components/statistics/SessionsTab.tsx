import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StatisticsData } from "@/types/statistics";
import { NoDataMessage } from "./NoDataMessage";
import { formatPercent, formatTime } from "./utils";

interface SessionsTabProps {
  loading: boolean;
  statistics: StatisticsData | null;
  recentSessions: Array<{
    id: string;
    formattedDate: string;
    formattedTime: string;
    formattedDuration: string;
    skipRate: number;
    trackIds: string[];
    skippedTracks: number;
    deviceName: string;
    deviceType: string;
  }>;
}

export function SessionsTab({
  loading,
  statistics,
  recentSessions,
}: SessionsTabProps) {
  if (loading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (!statistics || statistics.sessions.length === 0) {
    return (
      <NoDataMessage message="No session data available yet. Keep listening to music to generate insights!" />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Recent Listening Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSessions.length > 0 ? (
            <div className="space-y-4">
              {recentSessions.map((session) => (
                <Card key={session.id} className="bg-muted/40">
                  <CardContent className="p-4">
                    <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                      <div>
                        <div className="font-medium">
                          {session.formattedDate} at {session.formattedTime}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {session.formattedDuration} •{" "}
                          {session.deviceName || "Unknown device"}
                        </div>
                      </div>
                      <div className="text-sm">
                        <div>{session.trackIds.length} tracks played</div>
                        <div className="text-muted-foreground">
                          {session.skippedTracks} skipped (
                          {formatPercent(session.skipRate)})
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No recent sessions recorded.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listening Devices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(
              statistics.sessions.reduce(
                (acc, session) => {
                  const deviceType = session.deviceType || "Unknown";
                  if (!acc[deviceType]) {
                    acc[deviceType] = {
                      count: 0,
                      totalDuration: 0,
                    };
                  }
                  acc[deviceType].count += 1;
                  acc[deviceType].totalDuration += session.durationMs;
                  return acc;
                },
                {} as Record<string, { count: number; totalDuration: number }>,
              ),
            )
              .sort((a, b) => b[1].count - a[1].count)
              .map(([deviceType, data]) => {
                const percentage =
                  (data.count / statistics.sessions.length) * 100;

                return (
                  <div key={deviceType} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{deviceType}</span>
                      <span>{data.count} sessions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Progress value={percentage} className="h-2" />
                      </div>
                      <div className="w-32 text-right text-xs">
                        {formatTime(data.totalDuration)}
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
          <CardTitle>Session Quality Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="bg-muted/40 rounded-lg p-4">
              <div className="text-2xl font-bold">
                {formatTime(statistics.avgSessionDurationMs || 0)}
              </div>
              <div className="text-muted-foreground text-sm">
                Average session duration
              </div>
            </div>

            <div className="bg-muted/40 rounded-lg p-4">
              <div className="text-2xl font-bold">
                {formatPercent(statistics.repeatListeningRate || 0)}
              </div>
              <div className="text-muted-foreground text-sm">
                Repeat listening rate
              </div>
            </div>

            <div className="bg-muted/40 rounded-lg p-4">
              <div className="text-2xl font-bold">
                {Math.max(
                  ...(statistics.sessions || []).map(
                    (s) => s.longestNonSkipStreak || 0,
                  ),
                  0,
                )}
              </div>
              <div className="text-muted-foreground text-sm">
                Longest non-skip streak
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
