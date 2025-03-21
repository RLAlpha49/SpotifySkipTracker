/**
 * StatisticsPage Component
 *
 * Visualizes detailed listening statistics and metrics including:
 * - Listening patterns and skip rates
 * - Time-based analytics
 * - Artist and genre preferences
 * - Historical trends and session data
 *
 * Uses React with dynamic charts to provide visual representation of user's
 * music listening habits, preferences, and patterns.
 */

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatisticsData } from "@/types/statistics";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  RefreshCw,
  Clock,
  SkipForward,
  Calendar,
  Music,
  User,
  PlayCircle,
  Trash2,
  Repeat,
  Laptop,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const stats = await window.spotify.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error("Failed to load statistics:", error);
      toast.error("Failed to load statistics", {
        description: "Could not retrieve listening statistics data.",
      });
      window.spotify.saveLog(`Error loading statistics: ${error}`, "ERROR");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  // Helper functions for formatting
  const formatTime = (ms: number) => {
    if (!ms) return "0m";

    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getDayName = (day: number) => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[day];
  };

  const getHourLabel = (hour: number) => {
    return `${hour}:00${hour < 12 ? "am" : "pm"}`;
  };

  // Calculate derived statistics
  const statsSummary = useMemo(() => {
    if (!statistics) return null;

    // Get the latest daily metrics
    const dates = Object.keys(statistics.dailyMetrics).sort().reverse();
    const recentDayKey = dates[0];
    const recentDay = recentDayKey
      ? statistics.dailyMetrics[recentDayKey]
      : null;

    // Calculate values
    return {
      totalListeningTime: formatTime(statistics.totalListeningTimeMs),
      skipRate: formatPercent(statistics.overallSkipRate),
      skipRateValue: statistics.overallSkipRate,
      discoveryRate: formatPercent(statistics.discoveryRate),
      totalTracks: statistics.totalUniqueTracks,
      totalArtists: statistics.totalUniqueArtists,
      mostActiveDay: getDayName(
        statistics.dailyDistribution.indexOf(
          Math.max(...statistics.dailyDistribution),
        ),
      ),
      peakListeningHour: getHourLabel(
        statistics.hourlyDistribution.indexOf(
          Math.max(...statistics.hourlyDistribution),
        ),
      ),
      recentTracksCount: recentDay?.tracksPlayed || 0,
      recentSkipCount: recentDay?.tracksSkipped || 0,
      recentListeningTime: formatTime(recentDay?.listeningTimeMs || 0),
    };
  }, [statistics]);

  // Get listening session details
  const recentSessions = useMemo(() => {
    if (!statistics?.sessions) return [];

    return statistics.sessions
      .sort(
        (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime(),
      )
      .slice(0, 5)
      .map((session) => ({
        ...session,
        formattedDate: new Date(session.startTime).toLocaleDateString(),
        formattedTime: new Date(session.startTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        formattedDuration: formatTime(session.durationMs),
        skipRate:
          session.trackIds.length > 0
            ? session.skippedTracks / session.trackIds.length
            : 0,
      }));
  }, [statistics]);

  const handleClearStatistics = async () => {
    try {
      setClearing(true);
      const result = await window.spotify.clearStatistics();
      if (result) {
        toast.success("Statistics cleared successfully");
        fetchStatistics();
      } else {
        toast.error("Failed to clear statistics");
      }
    } catch (error) {
      console.error("Error clearing statistics:", error);
      toast.error("Failed to clear statistics", {
        description: "An error occurred while clearing statistics data.",
      });
      window.spotify.saveLog(`Error clearing statistics: ${error}`, "ERROR");
    } finally {
      setClearing(false);
      setClearDialogOpen(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Listening Statistics</h1>
          <p className="text-muted-foreground text-sm">
            Detailed insights into your Spotify listening habits and
            preferences.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            onClick={fetchStatistics}
            disabled={loading}
            className="flex items-center gap-1"
          >
            {loading ? (
              "Loading..."
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </>
            )}
          </Button>

          <Button
            onClick={() => setClearDialogOpen(true)}
            disabled={loading || !statistics || clearing}
            variant="outline"
            className="flex items-center gap-1"
          >
            {clearing ? (
              "Clearing..."
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Clear</span>
              </>
            )}
          </Button>

          <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive">
                  Clear Statistics
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-4">
                  <p className="font-medium">
                    This action is{" "}
                    <span className="text-destructive font-bold">
                      PERMANENT
                    </span>{" "}
                    and{" "}
                    <span className="text-destructive font-bold">
                      CANNOT BE UNDONE
                    </span>
                    .
                  </p>
                  <div className="bg-destructive/20 rounded-md p-3 text-sm">
                    <p className="mb-2">
                      All of the following data will be permanently deleted:
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                      <li>All listening history and statistics</li>
                      <li>Artist listening patterns and skip rates</li>
                      <li>Session data and device usage information</li>
                      <li>Daily, weekly, and monthly metrics</li>
                      <li>Time-based analytics and trends</li>
                    </ul>
                  </div>
                  <p>Are you sure you want to continue?</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={clearing}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearStatistics}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/70 transition-colors"
                  disabled={clearing}
                >
                  {clearing ? "Clearing..." : "I Understand, Clear All Data"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="mb-4 flex w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="listening">Listening Patterns</TabsTrigger>
          <TabsTrigger value="time">Time Analytics</TabsTrigger>
          <TabsTrigger value="artists">Artists</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="tracks">Tracks</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="patterns">Skip Patterns</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="mt-2 h-4 w-32" />
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : !statistics ? (
            <div className="mb-6 rounded-lg bg-amber-50 p-4 dark:bg-amber-950/20">
              <p className="text-amber-800 dark:text-amber-400">
                No statistics data available yet. Keep listening to music to
                generate insights!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4" />
                    Total Listening Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsSummary?.totalListeningTime}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {statistics.totalUniqueTracks} unique tracks played
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <SkipForward className="h-4 w-4" />
                    Skip Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsSummary?.skipRate}
                  </div>
                  <Progress
                    value={
                      statsSummary?.skipRateValue
                        ? statsSummary.skipRateValue * 100
                        : 0
                    }
                    className="mt-2 h-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <User className="h-4 w-4" />
                    Artists
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statistics.totalUniqueArtists}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Discovery rate: {statsSummary?.discoveryRate}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4" />
                    Most Active Day
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsSummary?.mostActiveDay}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Peak hour: {statsSummary?.peakListeningHour}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <PlayCircle className="h-4 w-4" />
                    Today&apos;s Listening
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsSummary?.recentListeningTime}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {statsSummary?.recentTracksCount} tracks (
                    {statsSummary?.recentSkipCount} skipped)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Music className="h-4 w-4" />
                    Tracks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statistics.totalUniqueTracks}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {Object.keys(statistics.artistMetrics).length} artists
                    tracked
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Repeat className="h-4 w-4" />
                    Repeat Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatPercent(statistics.repeatListeningRate || 0)}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Tracks repeated within sessions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Laptop className="h-4 w-4" />
                    Device Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Object.keys(statistics.deviceMetrics || {}).length}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Devices tracked
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Listening Patterns Tab */}
        <TabsContent value="listening">
          {loading ? (
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
          ) : !statistics ? (
            <div className="mb-6 rounded-lg bg-amber-50 p-4 dark:bg-amber-950/20">
              <p className="text-amber-800 dark:text-amber-400">
                No listening pattern data available yet. Keep listening to music
                to generate insights!
              </p>
            </div>
          ) : (
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
                            <Progress
                              value={data.skipRate * 100}
                              className="h-2"
                            />
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
                        const maxCount = Math.max(
                          ...statistics.hourlyDistribution,
                        );
                        const percentage =
                          maxCount > 0 ? (count / maxCount) * 100 : 0;

                        // Only show non-zero hours and group by 4 hours
                        if (hour % 4 === 0 || percentage > 10) {
                          return (
                            <div key={hour} className="flex items-center gap-2">
                              <div className="w-12 text-xs">
                                {getHourLabel(hour)}
                              </div>
                              <div className="flex-1">
                                <div
                                  className="bg-primary h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <div className="w-8 text-right text-xs">
                                {count}
                              </div>
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
                        const maxCount = Math.max(
                          ...statistics.dailyDistribution,
                        );
                        const percentage =
                          maxCount > 0 ? (count / maxCount) * 100 : 0;

                        return (
                          <div key={day} className="flex items-center gap-2">
                            <div className="w-24 text-xs">
                              {getDayName(day)}
                            </div>
                            <div className="flex-1">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <div className="w-8 text-right text-xs">
                              {count}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Time Analytics Tab */}
        <TabsContent value="time">
          {loading ? (
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
          ) : !statistics ? (
            <div className="mb-6 rounded-lg bg-amber-50 p-4 dark:bg-amber-950/20">
              <p className="text-amber-800 dark:text-amber-400">
                No time analytics data available yet. Keep listening to music to
                generate insights!
              </p>
            </div>
          ) : (
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
                        const displayMonth = new Date(
                          month + "-01",
                        ).toLocaleDateString(undefined, {
                          month: "long",
                          year: "numeric",
                        });
                        const maxMetrics = Math.max(
                          ...Object.values(statistics.monthlyMetrics).map(
                            (m) => m.tracksPlayed,
                          ),
                        );
                        const percentage =
                          maxMetrics > 0
                            ? (data.tracksPlayed / maxMetrics) * 100
                            : 0;

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
                                {formatPercent(
                                  data.tracksSkipped / data.tracksPlayed,
                                )}{" "}
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
                          <div className="mb-2 text-sm">Skip Rate Trend</div>
                          <div className="flex h-[180px] items-end justify-between gap-1">
                            {(
                              statistics.recentSkipRateTrend ||
                              Array(14).fill(0)
                            ).map((rate, index) => {
                              const height = `${Math.max(rate * 100, 5)}%`;
                              const date = new Date();
                              date.setDate(date.getDate() - (13 - index));
                              const day = date.getDate();

                              return (
                                <div
                                  key={index}
                                  className="flex flex-1 flex-col items-center gap-1"
                                >
                                  <div
                                    className="relative w-full overflow-hidden rounded-sm bg-gray-200 dark:bg-gray-800"
                                    style={{ height: "90%" }}
                                  >
                                    <div
                                      className="bg-primary absolute bottom-0 w-full transition-all duration-500"
                                      style={{ height }}
                                    ></div>
                                  </div>
                                  <div className="text-xs">{day}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <div className="mb-2 text-sm">
                            Listening Time Trend
                          </div>
                          <div className="flex h-[180px] items-end justify-between gap-1">
                            {(
                              statistics.recentListeningTimeTrend ||
                              Array(14).fill(0)
                            ).map((time, _index) => {
                              const maxTime = Math.max(
                                ...(statistics.recentListeningTimeTrend || [1]),
                                1,
                              );
                              const height = `${Math.max((time / maxTime) * 100, 5)}%`;
                              const date = new Date();
                              date.setDate(date.getDate() - (13 - _index));
                              const day = date.getDate();

                              return (
                                <div
                                  key={_index}
                                  className="flex flex-1 flex-col items-center gap-1"
                                >
                                  <div
                                    className="relative w-full overflow-hidden rounded-sm bg-gray-200 dark:bg-gray-800"
                                    style={{ height: "90%" }}
                                  >
                                    <div
                                      className="absolute bottom-0 w-full bg-green-500 transition-all duration-500"
                                      style={{ height }}
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
          )}
        </TabsContent>

        {/* Artists Tab */}
        <TabsContent value="artists">
          {loading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : !statistics ||
            Object.keys(statistics.artistMetrics).length === 0 ? (
            <div className="mb-6 rounded-lg bg-amber-50 p-4 dark:bg-amber-950/20">
              <p className="text-amber-800 dark:text-amber-400">
                No artist data available yet. Keep listening to music to
                generate insights!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Top Artists by Listening Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(statistics.artistMetrics)
                      .sort(
                        (a, b) => b[1].listeningTimeMs - a[1].listeningTimeMs,
                      )
                      .slice(0, 10)
                      .map(([artistId, data]) => {
                        const maxTime = Math.max(
                          ...Object.values(statistics.artistMetrics).map(
                            (a) => a.listeningTimeMs,
                          ),
                        );
                        const percentage =
                          maxTime > 0
                            ? (data.listeningTimeMs / maxTime) * 100
                            : 0;

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
                            statistics.artistMetrics &&
                            statistics.artistMetrics[id],
                        )
                        .slice(0, 8)
                        .map((artistId) => {
                          const artist = statistics.artistMetrics[artistId];
                          return (
                            <div
                              key={artistId}
                              className="bg-muted/40 rounded-lg p-4"
                            >
                              <div className="truncate font-medium">
                                {artist.name}
                              </div>
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
                    Discovery rate:{" "}
                    {formatPercent(statistics.discoveryRate || 0)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          {loading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : !statistics || statistics.sessions.length === 0 ? (
            <div className="mb-6 rounded-lg bg-amber-50 p-4 dark:bg-amber-950/20">
              <p className="text-amber-800 dark:text-amber-400">
                No session data available yet. Keep listening to music to
                generate insights!
              </p>
            </div>
          ) : (
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
                                  {session.formattedDate} at{" "}
                                  {session.formattedTime}
                                </div>
                                <div className="text-muted-foreground text-sm">
                                  {session.formattedDuration} •{" "}
                                  {session.deviceName || "Unknown device"}
                                </div>
                              </div>
                              <div className="text-sm">
                                <div>
                                  {session.trackIds.length} tracks played
                                </div>
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
                        {} as Record<
                          string,
                          { count: number; totalDuration: number }
                        >,
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
          )}
        </TabsContent>

        {/* New Tracks Tab */}
        <TabsContent value="tracks">
          {loading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : !statistics ||
            !statistics.trackMetrics ||
            Object.keys(statistics.trackMetrics).length === 0 ? (
            <div className="mb-6 rounded-lg bg-amber-50 p-4 dark:bg-amber-950/20">
              <p className="text-amber-800 dark:text-amber-400">
                No track data available yet. Keep listening to music to generate
                insights!
              </p>
            </div>
          ) : (
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
                        const completionPercentage =
                          data.avgCompletionPercent || 0;

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
                      .filter(
                        ([, data]) => data.playCount >= 2 && data.skipCount > 0,
                      )
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
                              <span className="max-w-[70%] truncate">
                                {data.name}
                              </span>
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
                        const formattedDate = date.toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                          },
                        );
                        const formattedTime = date.toLocaleTimeString(
                          undefined,
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        );

                        return (
                          <div key={trackId} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="max-w-[70%] truncate">
                                {data.name}
                              </span>
                              <span>
                                {formattedDate}, {formattedTime}
                              </span>
                            </div>
                            <div className="text-muted-foreground truncate text-xs">
                              {data.artistName} •{" "}
                              {data.hasBeenRepeated
                                ? "Repeated"
                                : "Single play"}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* New Devices Tab */}
        <TabsContent value="devices">
          {loading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : !statistics ||
            !statistics.deviceMetrics ||
            Object.keys(statistics.deviceMetrics).length === 0 ? (
            <div className="mb-6 rounded-lg bg-amber-50 p-4 dark:bg-amber-950/20">
              <p className="text-amber-800 dark:text-amber-400">
                No device data available yet. Keep listening to music on
                different devices to generate insights!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Device Usage Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(statistics.deviceMetrics || {})
                      .sort(
                        (a, b) => b[1].listeningTimeMs - a[1].listeningTimeMs,
                      )
                      .map(([deviceId, data]) => {
                        const maxTime = Math.max(
                          ...Object.values(statistics.deviceMetrics || {}).map(
                            (d) => d.listeningTimeMs,
                          ),
                        );
                        const percentage =
                          maxTime > 0
                            ? (data.listeningTimeMs / maxTime) * 100
                            : 0;

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
                              Peak usage:{" "}
                              {getHourLabel(data.peakUsageHour || 0)}
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
          )}
        </TabsContent>

        {/* Skip Patterns Tab */}
        <TabsContent value="patterns">
          {loading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : !statistics ||
            !statistics.skipPatterns ||
            Object.keys(statistics.skipPatterns).length === 0 ? (
            <div className="mb-6 rounded-lg bg-amber-50 p-4 dark:bg-amber-950/20">
              <p className="text-amber-800 dark:text-amber-400">
                No skip pattern data available yet. Keep listening to music to
                generate insights!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Sequential Skip Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(statistics.skipPatterns || {})
                      .sort(
                        (a, b) =>
                          new Date(b[0]).getTime() - new Date(a[0]).getTime(),
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
                              <span>
                                {data.skipSequenceCount || 0} sequences
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <div className="flex h-10 items-end gap-1">
                                  {[...Array(Math.min(maxSkips, 10))].map(
                                    (_, i) => (
                                      <div
                                        key={i}
                                        className="bg-primary w-full rounded-t-sm"
                                        style={{
                                          height: `${((i + 1) / maxSkips) * 100}%`,
                                        }}
                                      ></div>
                                    ),
                                  )}
                                </div>
                              </div>
                              <div className="text-right text-sm">
                                <div>Max: {maxSkips} skips</div>
                                <div className="text-muted-foreground text-xs">
                                  Avg:{" "}
                                  {(data.avgSkipsPerSequence || 0).toFixed(1)}{" "}
                                  per sequence
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
                          (b.longestNonSkipStreak || 0) -
                          (a.longestNonSkipStreak || 0),
                      )
                      .slice(0, 5)
                      .map((session) => {
                        const date = new Date(
                          session.startTime,
                        ).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        });
                        const percentage =
                          session.trackIds &&
                          session.trackIds.length > 0 &&
                          session.longestNonSkipStreak
                            ? (session.longestNonSkipStreak /
                                session.trackIds.length) *
                              100
                            : 0;

                        return (
                          <div key={session.id} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{date}</span>
                              <span>
                                {session.longestNonSkipStreak || 0} tracks
                              </span>
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
                            <div className="absolute top-full w-full pt-1 text-center text-xs">
                              {getHourLabel(hour)}
                            </div>
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
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
