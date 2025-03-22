import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Smartphone,
  Laptop,
  Tablet,
  Clock,
  PlayCircle,
  SkipForward,
  Sunrise,
  Sunset,
  Sun,
  Moon,
  AlarmClock,
  Cpu,
} from "lucide-react";
import { StatisticsData } from "@/types/statistics";
import { NoDataMessage } from "./NoDataMessage";
import { formatPercent, formatTime, getHourLabel } from "./utils";

interface DevicesTabProps {
  loading: boolean;
  statistics: StatisticsData | null;
}

export function DevicesTab({ loading, statistics }: DevicesTabProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/40 overflow-hidden transition-all duration-200 md:col-span-2">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-2 w-full flex-1" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-3 w-36" />
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
              {Array(4)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-2 w-full flex-1" />
                    <Skeleton className="h-4 w-12" />
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
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="mb-4">
                    <Skeleton className="mb-2 h-4 w-32" />
                    <Skeleton className="h-8 w-full rounded-md" />
                    <div className="flex w-full justify-between pt-1">
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
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

  // Function to determine device icon based on device type
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

  // Function to get color based on skip rate
  const getSkipRateColor = (skipRate: number) => {
    if (skipRate < 0.2) return "bg-emerald-500";
    if (skipRate < 0.4) return "bg-amber-500";
    return "bg-rose-500";
  };

  // Function to get text color based on skip rate
  const getSkipRateTextColor = (skipRate: number) => {
    if (skipRate < 0.2) return "text-emerald-500";
    if (skipRate < 0.4) return "text-amber-500";
    return "text-rose-500";
  };

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
      <Card className="hover:border-primary/30 group overflow-hidden transition-all duration-200 hover:shadow-md md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Cpu className="text-primary h-4 w-4" />
            Device Usage Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="relative">
            <ScrollArea className="h-[300px] pr-4">
              <div className="mr-2 space-y-4 pb-1">
                {Object.entries(statistics.deviceMetrics || {})
                  .sort((a, b) => b[1].listeningTimeMs - a[1].listeningTimeMs)
                  .map(([deviceId, data], index) => {
                    const maxTime = Math.max(
                      ...Object.values(statistics.deviceMetrics || {}).map(
                        (d) => d.listeningTimeMs,
                      ),
                    );
                    const percentage =
                      maxTime > 0 ? (data.listeningTimeMs / maxTime) * 100 : 0;

                    // Determine if this is a primary device
                    const isPrimaryDevice = index === 0;
                    const progressBarColor = isPrimaryDevice
                      ? "bg-primary"
                      : "bg-primary/60";

                    return (
                      <div key={deviceId} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span
                            className={`flex items-center gap-1.5 font-medium ${isPrimaryDevice ? "text-primary" : ""}`}
                          >
                            {getDeviceIcon(data.deviceType)}
                            {data.deviceName}
                            <span className="text-muted-foreground text-xs">
                              {data.deviceType}
                            </span>
                          </span>
                          <span className="flex items-center gap-1.5 text-xs font-medium">
                            <Clock className="text-primary h-3.5 w-3.5" />
                            {formatTime(data.listeningTimeMs)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <Progress
                              value={percentage}
                              className={`h-2 ${progressBarColor}`}
                            />
                          </div>
                          <div className="flex w-32 items-center justify-end gap-1.5 text-right text-xs">
                            <PlayCircle className="text-muted-foreground h-3.5 w-3.5" />
                            <span>{data.tracksPlayed}</span>
                            <span className="text-muted-foreground mx-1">
                              •
                            </span>
                            <SkipForward className="text-muted-foreground h-3.5 w-3.5" />
                            <span
                              className={getSkipRateTextColor(data.skipRate)}
                            >
                              {formatPercent(data.skipRate)}
                            </span>
                          </div>
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <AlarmClock className="h-3.5 w-3.5" />
                          Peak usage: {getTimeIcon(
                            data.peakUsageHour || 0,
                          )}{" "}
                          {getHourLabel(data.peakUsageHour || 0)}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <Card className="group overflow-hidden transition-all duration-200 hover:border-rose-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <SkipForward className="h-4 w-4 text-rose-500" />
            Skip Rates by Device
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="relative">
            <ScrollArea className="h-[260px] pr-4">
              <div className="mr-2 space-y-4 pb-1">
                {Object.entries(statistics.deviceMetrics || {})
                  .sort((a, b) => b[1].skipRate - a[1].skipRate)
                  .map(([deviceId, data]) => (
                    <div
                      key={deviceId}
                      className="hover:bg-muted/50 rounded-md px-2 py-1 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex min-w-8 items-center justify-center">
                          {getDeviceIcon(data.deviceType)}
                        </div>
                        <div
                          className="w-32 truncate text-sm font-medium"
                          title={`${data.deviceName} (${data.deviceType})`}
                        >
                          {data.deviceName}
                        </div>
                        <div className="flex-1">
                          <Progress
                            value={(data.skipRate || 0) * 100}
                            className={`h-2 ${getSkipRateColor(data.skipRate || 0)}`}
                          />
                        </div>
                        <div
                          className={`w-16 text-right text-sm font-semibold ${getSkipRateTextColor(data.skipRate || 0)}`}
                        >
                          {formatPercent(data.skipRate || 0)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <Card className="group overflow-hidden transition-all duration-200 hover:border-amber-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-amber-500" />
            Device Usage by Time of Day
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="relative">
            <ScrollArea className="h-[260px] pr-4">
              <div className="mr-2 space-y-4 pb-1">
                {Object.entries(statistics.deviceMetrics || {})
                  .sort((a, b) => b[1].listeningTimeMs - a[1].listeningTimeMs)
                  .map(([deviceId, data]) => {
                    // Determine time period classification
                    const hour = data.peakUsageHour || 0;
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
                        ? "bg-amber-500"
                        : timePeriod === "Afternoon"
                          ? "bg-orange-500"
                          : timePeriod === "Evening"
                            ? "bg-rose-500"
                            : "bg-indigo-500";

                    const textColorClass =
                      timePeriod === "Morning"
                        ? "text-amber-500"
                        : timePeriod === "Afternoon"
                          ? "text-orange-500"
                          : timePeriod === "Evening"
                            ? "text-rose-500"
                            : "text-indigo-500";

                    return (
                      <div
                        key={deviceId}
                        className="hover:bg-muted/20 mb-6 rounded-md p-2 transition-colors"
                      >
                        <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                          {getDeviceIcon(data.deviceType)}
                          {data.deviceName}
                        </h4>
                        <div className="bg-muted/30 relative h-10 w-full rounded-md">
                          <div
                            className={`absolute top-0 h-full rounded-md opacity-80 ${timeColorClass}`}
                            style={{
                              left: `${((data.peakUsageHour || 0) / 24) * 100}%`,
                              width: "8.33%", // 2 hours width
                            }}
                          ></div>
                          {/* Time markers */}
                          <div className="text-muted-foreground absolute flex w-full justify-between text-xs">
                            {[0, 6, 12, 18, 24].map((h) => (
                              <div
                                key={h}
                                className="border-border/30 absolute h-10 border-l"
                                style={{ left: `${(h / 24) * 100}%` }}
                              ></div>
                            ))}
                          </div>
                        </div>

                        {/* Time markers */}
                        <div className="text-muted-foreground flex w-full justify-between pt-1 text-xs">
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

                        <div
                          className={`mt-2 flex items-center justify-center gap-1 text-xs ${textColorClass} font-medium`}
                        >
                          {getTimeIcon(data.peakUsageHour || 0)}
                          Peak: {getHourLabel(data.peakUsageHour || 0)} (
                          {timePeriod})
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
