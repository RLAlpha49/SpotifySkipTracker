/**
 * Advanced Music Listening Analytics Dashboard
 *
 * Visualizes and analyzes user's Spotify listening patterns with multi-dimensional
 * data exploration capabilities. Transforms raw listening data into actionable
 * insights through interactive visualizations and statistical analysis.
 *
 * Analytical dimensions:
 * - Temporal analysis (hourly, daily, weekly patterns)
 * - Artist and genre preference distribution
 * - Skip behavior correlation with track attributes
 * - Listening session length and engagement metrics
 * - Device usage patterns and context awareness
 *
 * Visualization components:
 * - Interactive time-series charts for trend analysis
 * - Heat maps for temporal pattern recognition
 * - Distribution graphs for statistical analysis
 * - Sortable data tables with metric filtering
 * - Summary cards with key performance indicators
 *
 * Data management features:
 * - Export capabilities in multiple formats (CSV, JSON)
 * - Data clearing with confirmation safeguards
 * - On-demand refresh for real-time insights
 * - Progressive disclosure of complex metrics
 *
 * Implementation architecture:
 * - Tab-based UI for logical data categorization
 * - Memoized calculations for performance optimization
 * - Modular chart components with consistent styling
 * - Clear loading states with graceful transitions
 */

import {
  ArtistsTab,
  ClearStatisticsDialog,
  DevicesTab,
  ExportDataTab,
  formatPercent,
  formatTime,
  getDayName,
  getHourLabel,
  ListeningPatternsTab,
  OverviewTab,
  SessionsTab,
  SkipPatternsTab,
  TimeAnalyticsTab,
  TracksTab,
} from "@/components/statistics";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatisticsData } from "@/types/statistics";
import {
  Clock,
  Disc,
  FileDown,
  GitBranch,
  LayoutDashboard,
  ListMusic,
  Music,
  RefreshCw,
  SkipForward,
  Smartphone,
  Trash2,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { toast, Toaster } from "sonner";

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  /**
   * Retrieves comprehensive listening statistics data
   *
   * Fetches the complete statistical dataset from the main process via IPC,
   * including temporal patterns, artist metrics, and session analytics.
   * Manages loading state for UI feedback and implements error handling
   * with appropriate user notifications. This is the primary data source
   * for all visualization components and statistical displays.
   *
   * The retrieved data includes:
   * - Global listening metrics and aggregated statistics
   * - Time-based distribution patterns (hourly, daily)
   * - Artist and track frequency analysis
   * - Detailed session history with metadata
   */
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

  /**
   * Permanently erases all collected statistics data
   *
   * Implements a protected operation for removing all statistical data
   * from persistent storage. Includes safety measures like confirmation
   * dialog and loading states to prevent accidental data loss. After
   * successful data removal, refreshes the statistics view to reflect
   * the cleared state.
   *
   * This operation:
   * 1. Shows confirmation UI before proceeding
   * 2. Displays loading state during the operation
   * 3. Communicates with main process to perform actual data removal
   * 4. Provides clear success/failure feedback to the user
   * 5. Refreshes UI state to reflect the data removal
   */
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
        className="space-y-4"
      >
        <div className="bg-card mb-4 h-auto rounded-lg border shadow">
          <TabsList className="no-scrollbar flex min-h-fit w-full flex-wrap justify-start gap-2 p-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="overview"
                    className={`flex items-center gap-1.5 rounded-md border px-3 py-2 shadow-sm transition-all duration-200 ${
                      activeTab === "overview"
                        ? "bg-primary/10 border-primary/50 text-primary -translate-y-0.5 font-semibold shadow-md"
                        : "bg-background/50 hover:bg-background/70 hover:border-border/50 border-transparent hover:-translate-y-0.5 hover:shadow"
                    }`}
                  >
                    <LayoutDashboard
                      className={`h-4 w-4 ${activeTab === "overview" ? "text-primary" : ""}`}
                    />
                    <span className="hidden sm:inline">Overview</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden">Overview</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="listening"
                    className={`flex items-center gap-1.5 rounded-md border px-3 py-2 shadow-sm transition-all duration-200 ${
                      activeTab === "listening"
                        ? "bg-primary/10 border-primary/50 text-primary -translate-y-0.5 font-semibold shadow-md"
                        : "bg-background/50 hover:bg-background/70 hover:border-border/50 border-transparent hover:-translate-y-0.5 hover:shadow"
                    }`}
                  >
                    <GitBranch
                      className={`h-4 w-4 ${activeTab === "listening" ? "text-primary" : ""}`}
                    />
                    <span className="hidden sm:inline">Listening Patterns</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden">
                  Listening Patterns
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="time"
                    className={`flex items-center gap-1.5 rounded-md border px-3 py-2 shadow-sm transition-all duration-200 ${
                      activeTab === "time"
                        ? "bg-primary/10 border-primary/50 text-primary -translate-y-0.5 font-semibold shadow-md"
                        : "bg-background/50 hover:bg-background/70 hover:border-border/50 border-transparent hover:-translate-y-0.5 hover:shadow"
                    }`}
                  >
                    <Clock
                      className={`h-4 w-4 ${activeTab === "time" ? "text-primary" : ""}`}
                    />
                    <span className="hidden sm:inline">Time Analytics</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden">
                  Time Analytics
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="artists"
                    className={`flex items-center gap-1.5 rounded-md border px-3 py-2 shadow-sm transition-all duration-200 ${
                      activeTab === "artists"
                        ? "bg-primary/10 border-primary/50 text-primary -translate-y-0.5 font-semibold shadow-md"
                        : "bg-background/50 hover:bg-background/70 hover:border-border/50 border-transparent hover:-translate-y-0.5 hover:shadow"
                    }`}
                  >
                    <Music
                      className={`h-4 w-4 ${activeTab === "artists" ? "text-primary" : ""}`}
                    />
                    <span className="hidden sm:inline">Artists</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden">Artists</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="sessions"
                    className={`flex items-center gap-1.5 rounded-md border px-3 py-2 shadow-sm transition-all duration-200 ${
                      activeTab === "sessions"
                        ? "bg-primary/10 border-primary/50 text-primary -translate-y-0.5 font-semibold shadow-md"
                        : "bg-background/50 hover:bg-background/70 hover:border-border/50 border-transparent hover:-translate-y-0.5 hover:shadow"
                    }`}
                  >
                    <ListMusic
                      className={`h-4 w-4 ${activeTab === "sessions" ? "text-primary" : ""}`}
                    />
                    <span className="hidden sm:inline">Sessions</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden">Sessions</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="tracks"
                    className={`flex items-center gap-1.5 rounded-md border px-3 py-2 shadow-sm transition-all duration-200 ${
                      activeTab === "tracks"
                        ? "bg-primary/10 border-primary/50 text-primary -translate-y-0.5 font-semibold shadow-md"
                        : "bg-background/50 hover:bg-background/70 hover:border-border/50 border-transparent hover:-translate-y-0.5 hover:shadow"
                    }`}
                  >
                    <Disc
                      className={`h-4 w-4 ${activeTab === "tracks" ? "text-primary" : ""}`}
                    />
                    <span className="hidden sm:inline">Tracks</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden">Tracks</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="devices"
                    className={`flex items-center gap-1.5 rounded-md border px-3 py-2 shadow-sm transition-all duration-200 ${
                      activeTab === "devices"
                        ? "bg-primary/10 border-primary/50 text-primary -translate-y-0.5 font-semibold shadow-md"
                        : "bg-background/50 hover:bg-background/70 hover:border-border/50 border-transparent hover:-translate-y-0.5 hover:shadow"
                    }`}
                  >
                    <Smartphone
                      className={`h-4 w-4 ${activeTab === "devices" ? "text-primary" : ""}`}
                    />
                    <span className="hidden sm:inline">Devices</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden">Devices</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="patterns"
                    className={`flex items-center gap-1.5 rounded-md border px-3 py-2 shadow-sm transition-all duration-200 ${
                      activeTab === "patterns"
                        ? "bg-primary/10 border-primary/50 text-primary -translate-y-0.5 font-semibold shadow-md"
                        : "bg-background/50 hover:bg-background/70 hover:border-border/50 border-transparent hover:-translate-y-0.5 hover:shadow"
                    }`}
                  >
                    <SkipForward
                      className={`h-4 w-4 ${activeTab === "patterns" ? "text-primary" : ""}`}
                    />
                    <span className="hidden sm:inline">Skip Patterns</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden">
                  Skip Patterns
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="export"
                    className={`flex items-center gap-1.5 rounded-md border px-3 py-2 shadow-sm transition-all duration-200 ${
                      activeTab === "export"
                        ? "bg-primary/10 border-primary/50 text-primary -translate-y-0.5 font-semibold shadow-md"
                        : "bg-background/50 hover:bg-background/70 hover:border-border/50 border-transparent hover:-translate-y-0.5 hover:shadow"
                    }`}
                  >
                    <FileDown
                      className={`h-4 w-4 ${activeTab === "export" ? "text-primary" : ""}`}
                    />
                    <span className="hidden sm:inline">Export Data</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden">
                  Export Data
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </TabsList>
        </div>

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

        {/* Export Data Tab */}
        <TabsContent value="export">
          <ExportDataTab loading={loading} statistics={statistics} />
        </TabsContent>
      </Tabs>

      {/* Add the Toaster component from sonner */}
      <Toaster />
    </div>
  );
}
