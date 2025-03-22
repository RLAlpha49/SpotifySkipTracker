import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  History,
  Calendar,
  Clock,
  Smartphone,
  Laptop,
  Tablet,
  SkipForward,
  Repeat,
  Music2,
  Timer,
  Zap,
} from "lucide-react";
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
    return (
      <div className="space-y-4">
        <Card className="border-border/40 overflow-hidden transition-all duration-200">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <Card key={i} className="border-border/40 overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <Skeleton className="mb-2 h-4 w-32" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                        <div>
                          <Skeleton className="mb-2 h-4 w-24" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
                      <Skeleton className="h-3 w-16" />
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!statistics || statistics.sessions.length === 0) {
    return (
      <NoDataMessage message="No session data available yet. Keep listening to music to generate insights!" />
    );
  }

  // Function to determine color based on skip rate
  const getSkipRateColor = (skipRate: number) => {
    if (skipRate < 0.2) return "text-emerald-500";
    if (skipRate < 0.4) return "text-amber-500";
    return "text-rose-500";
  };

  // Function to get device icon based on type
  const getDeviceIcon = (deviceType: string) => {
    const type = deviceType.toLowerCase();
    if (type.includes("phone") || type.includes("mobile")) {
      return <Smartphone className="h-4 w-4 text-sky-500" />;
    } else if (type.includes("tablet") || type.includes("ipad")) {
      return <Tablet className="h-4 w-4 text-indigo-500" />;
    } else {
      return <Laptop className="h-4 w-4 text-violet-500" />;
    }
  };

  // Calculate total listening time for percentage calculations
  const totalListeningTime = Object.entries(
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
  ).reduce((total, [, data]) => total + data.totalDuration, 0);

  return (
    <div className="space-y-4">
      <Card className="hover:border-primary/30 group overflow-hidden transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <History className="text-primary h-4 w-4" />
            Recent Listening Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {recentSessions.length > 0 ? (
            <div className="relative">
              <ScrollArea className="h-[450px] overflow-auto pr-2">
                <div className="space-y-4 pb-1">
                  {recentSessions.map((session) => (
                    <Card
                      key={session.id}
                      className="border-border/60 hover:border-primary/20 border bg-transparent transition-all duration-200 hover:shadow-sm"
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                          <div>
                            <div className="flex items-center gap-2 font-medium">
                              <Calendar className="text-primary h-4 w-4" />
                              {session.formattedDate}
                              <span className="text-muted-foreground">•</span>
                              <Clock className="h-4 w-4 text-indigo-500" />
                              {session.formattedTime}
                            </div>
                            <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
                              <Timer className="h-3.5 w-3.5" />
                              {session.formattedDuration}
                              <span className="mx-1">•</span>
                              {getDeviceIcon(session.deviceType)}
                              {session.deviceName || "Unknown device"}
                            </div>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-1.5 font-medium">
                              <Music2 className="h-4 w-4 text-violet-500" />
                              {session.trackIds.length}{" "}
                              {session.trackIds.length === 1
                                ? "track"
                                : "tracks"}{" "}
                              played
                            </div>
                            <div className="flex items-center gap-1.5">
                              <SkipForward className="text-muted-foreground h-3.5 w-3.5" />
                              <span
                                className={`${getSkipRateColor(session.skipRate)}`}
                              >
                                {session.skippedTracks} skipped (
                                {formatPercent(session.skipRate)})
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Adding a subtle progress bar to indicate completion rate */}
                        <div className="mt-3">
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              Completion rate
                            </span>
                            <span
                              className={
                                session.skipRate < 0.3
                                  ? "text-emerald-500"
                                  : "text-amber-500"
                              }
                            >
                              {formatPercent(1 - session.skipRate)}
                            </span>
                          </div>
                          <Progress
                            value={(1 - session.skipRate) * 100}
                            className={`h-1.5 ${
                              session.skipRate < 0.2
                                ? "bg-emerald-500"
                                : session.skipRate < 0.4
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                            }`}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No recent sessions recorded.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="group overflow-hidden transition-all duration-200 hover:border-sky-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Smartphone className="h-4 w-4 text-sky-500" />
            Listening Devices
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
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
              .sort((a, b) => b[1].totalDuration - a[1].totalDuration)
              .map(([deviceType, data]) => {
                const timePercentage =
                  totalListeningTime > 0
                    ? (data.totalDuration / totalListeningTime) * 100
                    : 0;

                // Determine if this is a primary device (most used)
                const isPrimaryDevice = timePercentage > 50;

                return (
                  <div key={deviceType} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span
                        className={`flex items-center gap-1.5 font-medium ${isPrimaryDevice ? "text-sky-500" : ""}`}
                      >
                        {getDeviceIcon(deviceType)}
                        {deviceType}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <span>{data.count} sessions</span>
                        <span className="mx-0.5">•</span>
                        <span
                          className={
                            isPrimaryDevice ? "font-medium text-sky-500" : ""
                          }
                        >
                          {formatPercent(timePercentage / 100)}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Progress
                          value={timePercentage}
                          className={`h-2 ${isPrimaryDevice ? "bg-sky-500" : "bg-sky-500/50"}`}
                        />
                      </div>
                      <div className="w-24 text-right text-xs font-medium">
                        {formatTime(data.totalDuration)}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      <Card className="group overflow-hidden transition-all duration-200 hover:border-indigo-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Zap className="h-4 w-4 text-indigo-500" />
            Session Quality Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="border-primary/30 overflow-hidden transition-all duration-200 hover:shadow-sm">
              <CardContent className="p-4">
                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
                  <Clock className="h-3.5 w-3.5" />
                  Average session duration
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-primary text-2xl font-bold">
                    {formatTime(statistics.avgSessionDurationMs || 0)}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    per session
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-violet-300/70 transition-all duration-200 hover:shadow-sm">
              <CardContent className="p-4">
                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
                  <Repeat className="h-3.5 w-3.5" />
                  Repeat listening rate
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold text-violet-500">
                    {formatPercent(statistics.repeatListeningRate || 0)}
                  </div>
                  <div className="text-muted-foreground text-xs">of tracks</div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-emerald-300/70 transition-all duration-200 hover:shadow-sm">
              <CardContent className="p-4">
                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
                  <Zap className="h-3.5 w-3.5" />
                  Longest non-skip streak
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold text-emerald-500">
                    {Math.max(
                      ...(statistics.sessions || []).map(
                        (s) => s.longestNonSkipStreak || 0,
                      ),
                      0,
                    )}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    tracks in a row
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
