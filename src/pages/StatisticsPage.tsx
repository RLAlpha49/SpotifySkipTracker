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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatisticsData } from "@/types/statistics";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2 } from "lucide-react";
import {
  OverviewTab,
  ListeningPatternsTab,
  TimeAnalyticsTab,
  ArtistsTab,
  SessionsTab,
  TracksTab,
  DevicesTab,
  SkipPatternsTab,
  ClearStatisticsDialog,
  formatTime,
  formatPercent,
  getDayName,
  getHourLabel,
} from "@/components/statistics";

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

          <ClearStatisticsDialog
            open={clearDialogOpen}
            onOpenChange={setClearDialogOpen}
            onClear={handleClearStatistics}
            clearing={clearing}
          />
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
          <OverviewTab
            loading={loading}
            statistics={statistics}
            statsSummary={statsSummary}
          />
        </TabsContent>

        {/* Listening Patterns Tab */}
        <TabsContent value="listening">
          <ListeningPatternsTab loading={loading} statistics={statistics} />
        </TabsContent>

        {/* Time Analytics Tab */}
        <TabsContent value="time">
          <TimeAnalyticsTab loading={loading} statistics={statistics} />
        </TabsContent>

        {/* Artists Tab */}
        <TabsContent value="artists">
          <ArtistsTab loading={loading} statistics={statistics} />
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <SessionsTab
            loading={loading}
            statistics={statistics}
            recentSessions={recentSessions}
          />
        </TabsContent>

        {/* Tracks Tab */}
        <TabsContent value="tracks">
          <TracksTab loading={loading} statistics={statistics} />
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices">
          <DevicesTab loading={loading} statistics={statistics} />
        </TabsContent>

        {/* Skip Patterns Tab */}
        <TabsContent value="patterns">
          <SkipPatternsTab loading={loading} statistics={statistics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
