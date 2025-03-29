/**
 * @packageDocumentation
 * @module HomePage
 * @description Spotify Playback Monitoring and Analytics Hub
 *
 * Central command center for real-time Spotify integration with dual-function interface:
 * - Live monitoring dashboard with playback controls and system status
 * - Statistics overview with aggregated listening insights
 *
 * Core features:
 * - Real-time playback tracking with metadata display and control buttons
 * - Authentication management with secure credential handling
 * - Interactive monitoring controls with status indicators and toggles
 * - Live application logging with filtering and search capabilities
 * - Aggregated listening statistics with visual representations
 * - Lazy-loaded component architecture for optimized performance
 *
 * Implementation highlights:
 * - Responsive layout adapting to different device viewports
 * - Tab-based navigation between monitoring and statistics views
 * - IPC communication with Electron main process for native functionality
 * - WebSocket-like playback information with update listeners
 * - Error boundary implementation with graceful fallbacks
 */

import { MonitoringStatus } from "@/components/spotify/PlaybackMonitoringCard";
import { LoadingSpinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DashboardArtistData,
  DashboardSessionData,
  StatisticsSummary as DashboardStatisticsSummary,
  DashboardTrackData,
} from "@/types/dashboard";
import { LogLevel } from "@/types/logging";
import { LogSettings, PlaybackInfo } from "@/types/spotify";
import { MusicIcon } from "lucide-react";
import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Dashboard components
const DashboardLayout = lazy(() =>
  import("@/layouts/DashboardLayout").then((module) => ({
    default: module.DashboardLayout,
  })),
);
const StatisticsSummary = lazy(() =>
  import("@/components/dashboard/StatisticsSummary").then((module) => ({
    default: module.StatisticsSummary,
  })),
);
const RecentTracks = lazy(() =>
  import("@/components/dashboard/RecentTracks").then((module) => ({
    default: module.RecentTracks,
  })),
);
const ArtistSummary = lazy(() =>
  import("@/components/dashboard/ArtistSummary").then((module) => ({
    default: module.ArtistSummary,
  })),
);
const SessionOverview = lazy(() =>
  import("@/components/dashboard/SessionOverview").then((module) => ({
    default: module.SessionOverview,
  })),
);

// Spotify components with lazy loading and error fallbacks
const AuthenticationCard = lazy(() => {
  return import("@/components/spotify/AuthenticationCard")
    .then((module) => ({ default: module.AuthenticationCard }))
    .catch((err) => {
      console.error("Failed to load AuthenticationCard:", err);
      // Using JSX for the fallback component
      return {
        default: () =>
          React.createElement(
            "div",
            {
              className: "p-4 border border-red-500",
            },
            "Failed to load authentication component",
          ),
      };
    });
});

const NowPlayingCard = lazy(() => {
  return import("@/components/spotify/NowPlayingCard")
    .then((module) => ({ default: module.NowPlayingCard }))
    .catch((err) => {
      console.error("Failed to load NowPlayingCard:", err);
      return {
        default: () =>
          React.createElement(
            "div",
            {
              className: "p-4 border border-red-500",
            },
            "Failed to load playback component",
          ),
      };
    });
});

const PlaybackMonitoringCard = lazy(() => {
  return import("@/components/spotify/PlaybackMonitoringCard")
    .then((module) => ({ default: module.PlaybackMonitoringCard }))
    .catch((err) => {
      console.error("Failed to load PlaybackMonitoringCard:", err);
      return {
        default: () =>
          React.createElement(
            "div",
            {
              className: "p-4 border border-red-500",
            },
            "Failed to load monitoring component",
          ),
      };
    });
});

const LogsCard = lazy(() => {
  return import("@/components/spotify/LogsCard")
    .then((module) => ({ default: module.LogsCard }))
    .catch((err) => {
      console.error("Failed to load LogsCard:", err);
      return {
        default: () =>
          React.createElement(
            "div",
            {
              className: "p-4 border border-red-500",
            },
            "Failed to load logs component",
          ),
      };
    });
});

// Lazy load MonitoringLayout
const MonitoringLayout = lazy(() =>
  import("@/layouts/MonitoringLayout").then((module) => ({
    default: module.MonitoringLayout,
  })),
);

/**
 * HomePage component
 *
 * @source
 */
export default function HomePage() {
  const [playbackInfo, setPlaybackInfo] = useState<PlaybackInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [needsReauthentication, setNeedsReauthentication] = useState(false);
  const [settings, setSettings] = useState<LogSettings>({
    displayLogLevel: "INFO",
    logAutoRefresh: true,
  });
  const logsRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [logSearchTerm, setLogSearchTerm] = useState("");
  const [monitoringStatus, setMonitoringStatus] =
    useState<MonitoringStatus>("inactive");
  const [statusMessage, setStatusMessage] = useState<string | undefined>(
    undefined,
  );
  const [errorDetails, setErrorDetails] = useState<string | undefined>(
    undefined,
  );

  // Dashboard state
  const [activeView, setActiveView] = useState<"dashboard" | "monitoring">(
    "dashboard",
  );
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Initialize stats with default values to prevent undefined errors
  const [stats, setStats] = useState<DashboardStatisticsSummary>({
    totalTracks: 0,
    totalSkips: 0,
    skipPercentage: 0,
    todaySkips: 0,
    weekSkips: 0,
    monthSkips: 0,
    avgSkipTime: 0,
  });

  // Initialize empty arrays for dashboard components
  const [recentTracks, setRecentTracks] = useState<DashboardTrackData[]>([]);
  const [topArtists, setTopArtists] = useState<DashboardArtistData[]>([]);
  const [recentSessions, setRecentSessions] = useState<DashboardSessionData[]>(
    [],
  );

  /**
   * Retrieves current Spotify playback state and metadata
   *
   * Queries the Spotify API via IPC bridge to fetch the currently playing track,
   * playback progress, and player state. Updates component state with retrieved data
   * or handles errors gracefully with appropriate messaging.
   *
   * @returns Promise that resolves when playback state is updated
   */
  const getInitialPlayback = async () => {
    if (!isAuthenticated) return;

    try {
      const playback = await window.spotify.getCurrentPlayback();
      if (playback) {
        setPlaybackInfo({
          albumArt: playback.albumArt,
          trackName: playback.trackName,
          artist: playback.artistName || playback.artist,
          album: playback.albumName || playback.album,
          progress: playback.progress,
          duration: playback.duration,
          currentTimeSeconds: playback.currentTimeSeconds,
          isPlaying: playback.isPlaying,
          isInPlaylist: playback.isInPlaylist,
        });
      }
    } catch (error) {
      console.error("Error getting playback:", error);
    }
  };

  /**
   * Loads comprehensive dashboard statistics and visualization data
   *
   * Retrieves multiple data sources to populate dashboard components:
   * - Overall listening statistics and KPIs
   * - Recent skipped tracks with metadata
   * - Artist frequency analysis with skip patterns
   * - Session history with duration and engagement metrics
   *
   * Groups related API calls for efficiency and maintains loading state
   * for optimized UI feedback during data retrieval.
   */
  const fetchDashboardData = async () => {
    if (!isAuthenticated) {
      addLog(
        "fetchDashboardData: Not authenticated, skipping data fetch",
        "DEBUG",
      );
      return;
    }

    setIsLoadingStats(true);

    try {
      addLog("fetchDashboardData: Fetching statistics summary", "DEBUG");
      // Fetch summary stats
      const statsSummary = await window.spotify.getStatisticsSummary();
      setStats(statsSummary);

      addLog("fetchDashboardData: Fetching recent tracks", "DEBUG");
      // Fetch recent tracks
      const skippedTracks = await window.spotify.getRecentSkippedTracks(10);
      setRecentTracks(skippedTracks);

      addLog("fetchDashboardData: Fetching top artists", "DEBUG");
      // Fetch top artists
      const artists = await window.spotify.getTopSkippedArtists(5);
      setTopArtists(artists);

      addLog("fetchDashboardData: Fetching recent sessions", "DEBUG");
      // Fetch recent sessions
      const sessions = await window.spotify.getRecentSessions(3);
      setRecentSessions(sessions);

      addLog("fetchDashboardData: All data fetched successfully", "DEBUG");
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data. Please try again later.");
    } finally {
      addLog("fetchDashboardData: Setting isLoadingStats to false", "DEBUG");
      setIsLoadingStats(false);
    }
  };

  /**
   * Effect to fetch dashboard data when authenticated status changes
   */
  useEffect(() => {
    // Only fetch data when authentication state changes to true
    if (isAuthenticated) {
      addLog(
        "Authentication changed to true, fetching dashboard data",
        "DEBUG",
      );
      fetchDashboardData();
    }
  }, [isAuthenticated]);

  /**
   * Effect to auto-refresh dashboard statistics every second
   */
  useEffect(() => {
    // Only set up auto-refresh when authenticated and on dashboard view
    if (isAuthenticated && activeView === "dashboard") {
      addLog("Setting up auto-refresh for dashboard statistics", "DEBUG");

      // Create interval to refresh stats every second
      const statsRefreshInterval = setInterval(() => {
        // Use the non-loading version to avoid UI flicker
        fetchDashboardDataSilent();
      }, 1000);

      // Clean up interval on unmount or when conditions change
      return () => {
        addLog("Cleaning up dashboard statistics auto-refresh", "DEBUG");
        clearInterval(statsRefreshInterval);
      };
    }
  }, [isAuthenticated, activeView]);

  /**
   * Fetches dashboard data without changing loading state
   * Used for silent auto-refresh to prevent UI flicker
   */
  const fetchDashboardDataSilent = async () => {
    if (!isAuthenticated) return;

    try {
      // Fetch all data without showing loading indicators
      const statsSummary = await window.spotify.getStatisticsSummary();
      setStats(statsSummary);

      const skippedTracks = await window.spotify.getRecentSkippedTracks(10);
      setRecentTracks(skippedTracks);

      const artists = await window.spotify.getTopSkippedArtists(5);
      setTopArtists(artists);

      const sessions = await window.spotify.getRecentSessions(3);
      setRecentSessions(sessions);
    } catch (error) {
      console.error("Silent dashboard refresh error:", error);
      // No toast notifications for silent refresh errors
    }
  };

  /**
   * Initializes component on mount
   * - Loads application settings
   * - Checks authentication status
   * - Starts log refresh if enabled
   * - Loads dashboard data
   */
  useEffect(() => {
    const loadSettingsAndLogs = async () => {
      try {
        // First set a loading state so UI shows appropriate loaders
        setIsLoadingStats(true);

        const savedSettings = await window.spotify.getSettings();
        setSettings((prevSettings) => ({
          ...prevSettings,
          displayLogLevel: savedSettings.displayLogLevel || "INFO",
          logAutoRefresh: savedSettings.logAutoRefresh !== false,
        }));

        const savedLogs = await window.spotify.getLogs();
        setLogs(savedLogs);

        // Check authentication state
        const authStatus = await window.spotify.isAuthenticated();
        setIsAuthenticated(authStatus);
        setNeedsReauthentication(!authStatus);

        if (authStatus) {
          const monitoringStatus = await window.spotify.isMonitoringActive();
          setIsMonitoring(monitoringStatus);

          if (savedSettings.autoStartMonitoring && !monitoringStatus) {
            addLog("Auto-starting Spotify playback monitoring...", "DEBUG");
            const success = await window.spotify.startMonitoring();
            if (success) {
              setIsMonitoring(true);
              addLog("Playback monitoring started", "INFO");
            } else {
              addLog("Failed to auto-start monitoring", "ERROR");
            }
          }

          // Load dashboard data - now that we know we're authenticated
          // This is handled by the useEffect that watches isAuthenticated
        } else {
          // Reset loading stats since we're not going to fetch anything
          setIsLoadingStats(false);

          // Set default playback info when not authenticated
          setPlaybackInfo({
            albumArt: "",
            trackName: "Not Logged In",
            artist: "Please authenticate with Spotify",
            album: "Authentication required to track playback",
            progress: 0,
            duration: 0,
            currentTimeSeconds: 0,
            isPlaying: false,
            isInPlaylist: false,
          });
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
        addLog(`Error loading initial data: ${error}`, "ERROR");
        // Make sure we're not stuck in loading state
        setIsLoadingStats(false);
      }
    };

    loadSettingsAndLogs();
    getInitialPlayback();
    startLogsRefresh();

    return () => {
      if (logsRefreshIntervalRef.current) {
        clearInterval(logsRefreshIntervalRef.current);
        logsRefreshIntervalRef.current = null;
      }
    };
  }, []);

  /**
   * Sets up periodic log refresh mechanism
   * This will only refresh latest.log, not other log files
   */
  const startLogsRefresh = () => {
    if (logsRefreshIntervalRef.current) {
      clearInterval(logsRefreshIntervalRef.current);
    }

    if (!settings.logAutoRefresh) {
      return;
    }

    logsRefreshIntervalRef.current = setInterval(async () => {
      try {
        // Get logs from latest.log
        const updatedLogs = await window.spotify.getLogs();
        setLogs(updatedLogs);
      } catch (error) {
        console.error("Error refreshing logs:", error);
      }
    }, 500);
  };

  /**
   * Sets up real-time playback update listener
   * Only active when authenticated
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = window.spotify.onPlaybackUpdate((data) => {
      if (data.monitoringStopped) {
        setIsMonitoring(false);
        setMonitoringStatus("error");
        setStatusMessage("Monitoring stopped due to API errors");
        setErrorDetails("Try restarting the monitoring service");
        setPlaybackInfo({
          albumArt: "",
          trackName: "Monitoring Stopped",
          artist: "",
          album: "",
          progress: 0,
          duration: 0,
          currentTimeSeconds: 0,
          isPlaying: false,
          isInPlaylist: false,
        });

        addLog(
          "Spotify playback monitoring has stopped due to persistent API errors",
          "ERROR",
        );
        toast.error("Monitoring stopped", {
          description:
            "Spotify monitoring stopped due to API errors. Please try again later.",
        });

        return;
      }

      setPlaybackInfo({
        albumArt: data.albumArt,
        trackName: data.trackName,
        artist: data.artistName || data.artist || "",
        album: data.albumName || data.album || "",
        progress: data.progress,
        duration: data.duration,
        currentTimeSeconds: data.currentTimeSeconds,
        isPlaying: data.isPlaying,
        isInPlaylist: data.isInPlaylist,
      });
    });

    getInitialPlayback();

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated]);

  /**
   * Add a listener for monitoring status changes
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    // Subscribe to monitoring status changes
    const unsubscribe = window.spotify.onMonitoringStatusChange((status) => {
      // Update our state based on the monitoring status
      setMonitoringStatus(status.status as MonitoringStatus);
      setStatusMessage(status.message);
      setErrorDetails(status.details);

      // Update the isMonitoring flag based on active status
      if (status.status === "active") {
        setIsMonitoring(true);
      } else if (status.status === "inactive" || status.status === "error") {
        setIsMonitoring(false);
      }

      // Log the status change
      addLog(
        `Monitoring status changed: ${status.status}${status.message ? ` - ${status.message}` : ""}`,
        "DEBUG",
      );
    });

    // Check initial monitoring status
    window.spotify.getMonitoringStatus().then((status) => {
      setMonitoringStatus(status.status as MonitoringStatus);
      setStatusMessage(status.message);
      setErrorDetails(status.details);
      setIsMonitoring(status.active);
    });

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated]);

  /**
   * Saves log message and updates logs state
   * Always saves to latest.log regardless of which log file is being viewed
   *
   * @param message - Message content to log
   * @param level - Severity level for the log
   * @returns Promise<void>
   */
  const addLog = async (message: string, level: LogLevel = "INFO") => {
    try {
      await window.spotify.saveLog(message, level);
      const updatedLogs = await window.spotify.getLogs(100);
      setLogs(updatedLogs);
    } catch (error) {
      console.error("Error saving log:", error);
    }
  };

  /**
   * Updates log level display filter
   *
   * @param value - New log level to filter by
   * @returns Promise<void>
   */
  const handleDisplayLogLevelChange = async (value: string) => {
    try {
      setSettings((prev) => ({
        ...prev,
        displayLogLevel: value as
          | "DEBUG"
          | "INFO"
          | "WARNING"
          | "ERROR"
          | "CRITICAL",
      }));

      const currentSettings = await window.spotify.getSettings();
      await window.spotify.saveSettings({
        ...currentSettings,
        displayLogLevel: value as
          | "DEBUG"
          | "INFO"
          | "WARNING"
          | "ERROR"
          | "CRITICAL",
      });

      addLog(`Display log level changed to ${value}`, "DEBUG");
    } catch (error) {
      console.error("Error changing display log level:", error);
      addLog(`Error changing display log level: ${error}`, "ERROR");
    }
  };

  /**
   * Toggles automatic log refreshing
   *
   * @returns Promise<void>
   */
  const handleToggleLogAutoRefresh = async () => {
    try {
      const newAutoRefresh = !settings.logAutoRefresh;

      // Update local state
      setSettings((prev) => ({
        ...prev,
        logAutoRefresh: newAutoRefresh,
      }));

      // Save to storage
      const currentSettings = await window.spotify.getSettings();
      await window.spotify.saveSettings({
        ...currentSettings,
        logAutoRefresh: newAutoRefresh,
      });

      // Start or stop the refresh interval
      if (newAutoRefresh) {
        startLogsRefresh();
        addLog("Log auto-refresh enabled", "DEBUG");
      } else {
        if (logsRefreshIntervalRef.current) {
          clearInterval(logsRefreshIntervalRef.current);
          logsRefreshIntervalRef.current = null;
        }
        addLog("Log auto-refresh disabled", "DEBUG");
      }
    } catch (error) {
      console.error("Error toggling log auto-refresh:", error);
      addLog(`Error toggling log auto-refresh: ${error}`, "ERROR");
    }
  };

  /**
   * Updates log search filter term
   *
   * @param event - Input change event
   */
  const handleLogSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLogSearchTerm(event.target.value);
  };

  /**
   * Initiates Spotify API authentication process
   *
   * Orchestrates the OAuth flow by:
   * 1. Retrieving stored credentials if available
   * 2. Launching authentication window with proper parameters
   * 3. Handling authentication success or failure states
   * 4. Updating application state based on authentication result
   * 5. Triggering dependent data loading when authentication succeeds
   *
   * Provides user feedback throughout the process with toast notifications
   * and appropriate error handling.
   */
  const handleAuthenticate = async () => {
    try {
      const currentSettings = await window.spotify.getSettings();

      if (!currentSettings.clientId || !currentSettings.clientSecret) {
        addLog(
          "Authentication failed: Missing Spotify credentials in settings",
          "ERROR",
        );
        toast.error("Authentication Failed", {
          description:
            "Please configure your Spotify credentials in Settings first.",
        });
        return;
      }

      // Only force re-authentication when explicitly logging in
      // On page reload, we'll use existing tokens if they're valid
      const shouldForceAuth = needsReauthentication;

      toast.info("Connecting to Spotify", {
        description: shouldForceAuth
          ? "Clearing session data and opening Spotify login..."
          : "Checking authentication status...",
      });

      if (shouldForceAuth) {
        addLog("Authenticating with Spotify - clearing auth cookies", "INFO");
      } else {
        addLog("Checking existing Spotify authentication", "INFO");
      }

      const success = await window.spotify.authenticate(
        {
          clientId: currentSettings.clientId,
          clientSecret: currentSettings.clientSecret,
          redirectUri:
            currentSettings.redirectUri || "http://localhost:8888/callback",
        },
        shouldForceAuth,
      );

      if (success) {
        setIsAuthenticated(true);
        setNeedsReauthentication(false);
        addLog("Authentication successful", "INFO");

        if (currentSettings.autoStartMonitoring) {
          addLog(
            "Auto-starting Spotify playback monitoring after login...",
            "DEBUG",
          );
          const monitoringStarted = await window.spotify.startMonitoring();
          if (monitoringStarted) {
            setIsMonitoring(true);
            addLog("Playback monitoring started", "INFO");
          } else {
            addLog("Failed to auto-start monitoring", "ERROR");
          }
        }
      } else {
        addLog("Authentication failed", "ERROR");
      }
    } catch (error) {
      console.error("Authentication error:", error);
      addLog(`Authentication error: ${error}`, "ERROR");
    }
  };

  /**
   * Logs out from Spotify and clears playback state
   *
   * @returns Promise<void>
   */
  const handleLogout = async () => {
    try {
      addLog("Logging out from Spotify...", "INFO");

      if (isMonitoring) {
        await handleStopMonitoring();
      }

      const success = await window.spotify.logout();

      if (success) {
        setIsAuthenticated(false);
        setNeedsReauthentication(true);
        setPlaybackInfo({
          albumArt: "",
          trackName: "Not Logged In",
          artist: "Please authenticate with Spotify",
          album: "Authentication required to track playback",
          progress: 0,
          duration: 0,
          currentTimeSeconds: 0,
          isPlaying: false,
          isInPlaylist: false,
        });

        addLog("Logout successful", "INFO");
      } else {
        addLog("Logout failed", "ERROR");
      }
    } catch (error) {
      console.error("Logout error:", error);
      addLog(`Logout error: ${error}`, "ERROR");
    }
  };

  /**
   * Starts Spotify playback monitoring
   *
   * @returns Promise<void>
   */
  const handleStartMonitoring = async () => {
    try {
      // Update status immediately for better feedback
      setMonitoringStatus("initializing");
      setStatusMessage("Connecting to Spotify API...");
      setErrorDetails(undefined);

      addLog("Starting Spotify playback monitoring...", "INFO");
      const success = await window.spotify.startMonitoring();

      if (success) {
        setIsMonitoring(true);
        setMonitoringStatus("active");
        setStatusMessage(
          "Monitoring active since " + new Date().toLocaleTimeString(),
        );
      } else {
        setMonitoringStatus("error");
        setStatusMessage("Failed to initialize monitoring");
        setErrorDetails("Check Spotify connection and log for details");
        addLog("Failed to start monitoring", "ERROR");
      }
    } catch (error) {
      console.error("Error starting monitoring:", error);
      setMonitoringStatus("error");
      setStatusMessage("Error starting monitoring");
      setErrorDetails(String(error));
      addLog(`Error starting monitoring: ${error}`, "ERROR");
    }
  };

  /**
   * Stops Spotify playback monitoring
   *
   * @returns Promise<void>
   */
  const handleStopMonitoring = async () => {
    try {
      // Show stopping state
      setMonitoringStatus("initializing");
      setStatusMessage("Stopping monitoring service...");

      addLog("Stopping Spotify playback monitoring...", "INFO");
      const success = await window.spotify.stopMonitoring();

      if (success) {
        setIsMonitoring(false);
        setMonitoringStatus("inactive");
        setStatusMessage(undefined);
        setErrorDetails(undefined);
        setPlaybackInfo({
          albumArt: "",
          trackName: "Monitoring Stopped",
          artist: "Playback updates paused",
          album: "Start monitoring to resume tracking",
          progress: 0,
          duration: 0,
          currentTimeSeconds: 0,
          isPlaying: false,
          isInPlaylist: false,
        });
      } else {
        setMonitoringStatus("error");
        setStatusMessage("Failed to stop monitoring");
        setErrorDetails(
          "The monitoring service may be in an inconsistent state",
        );
        addLog("Failed to stop monitoring", "ERROR");
      }
    } catch (error) {
      console.error("Error stopping monitoring:", error);
      setMonitoringStatus("error");
      setStatusMessage("Error stopping monitoring");
      setErrorDetails(String(error));
      addLog(`Error stopping monitoring: ${error}`, "ERROR");
    }
  };

  /**
   * Clears application logs
   *
   * @returns Promise<boolean> indicating success or failure
   */
  const handleClearLogs = async (): Promise<boolean> => {
    try {
      const result = await window.spotify.clearLogs();
      if (result) {
        addLog("Logs cleared", "INFO");
      } else {
        addLog("Failed to clear logs", "ERROR");
      }
      return result;
    } catch (error) {
      console.error("Error clearing logs:", error);
      addLog(`Error clearing logs: ${error}`, "ERROR");
      return false;
    }
  };

  /**
   * Opens log directory in file explorer
   *
   * @returns Promise<boolean> indicating success or failure
   */
  const handleOpenLogsDirectory = async (): Promise<boolean> => {
    try {
      return await window.spotify.openLogsDirectory();
    } catch (error) {
      console.error("Error opening logs directory:", error);
      addLog(`Error opening logs directory: ${error}`, "ERROR");
      return false;
    }
  };

  /**
   * Toggles playback between play and pause
   *
   * @returns Promise<void>
   */
  const handlePlayPause = async () => {
    if (!isAuthenticated || !playbackInfo) return;

    try {
      addLog(
        `${playbackInfo.isPlaying ? "Pausing" : "Resuming"} Spotify playback...`,
        "DEBUG",
      );

      let success;
      if (playbackInfo.isPlaying) {
        success = await window.spotify.pausePlayback();
      } else {
        success = await window.spotify.resumePlayback();
      }

      if (!success) {
        addLog(
          `Failed to ${playbackInfo.isPlaying ? "pause" : "resume"} playback`,
          "ERROR",
        );
        toast.error(
          `Failed to ${playbackInfo.isPlaying ? "pause" : "resume"} playback`,
          {
            description: "There may be no playback to control.",
          },
        );
      }
    } catch (error) {
      console.error("Playback control error:", error);
      addLog(`Playback control error: ${error}`, "ERROR");
    }
  };

  /**
   * Skips to the previous track
   *
   * @returns Promise<void>
   */
  const handlePreviousTrack = async () => {
    if (!isAuthenticated) return;

    try {
      addLog("Skipping to previous track...", "DEBUG");
      const success = await window.spotify.skipToPreviousTrack();

      if (!success) {
        addLog("Failed to skip to previous track", "ERROR");
        toast.error("Failed to skip to previous track", {
          description: "There may be no previous track to skip to.",
        });
      }
    } catch (error) {
      console.error("Previous track error:", error);
      addLog(`Previous track error: ${error}`, "ERROR");
    }
  };

  /**
   * Skips to the next track
   *
   * @returns Promise<void>
   */
  const handleNextTrack = async () => {
    if (!isAuthenticated) return;

    try {
      addLog("Skipping to next track...", "DEBUG");
      const success = await window.spotify.skipToNextTrack();

      if (!success) {
        addLog("Failed to skip to next track", "ERROR");
        toast.error("Failed to skip to next track", {
          description: "There may be no next track to skip to.",
        });
      }
    } catch (error) {
      console.error("Next track error:", error);
      addLog(`Next track error: ${error}`, "ERROR");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8 border-b pb-4">
        <h1 className="flex items-center text-3xl font-bold tracking-tight">
          <MusicIcon className="text-primary mr-3 h-8 w-8" />
          Spotify Skip Tracker
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor your Spotify playback and identify frequently skipped tracks
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex h-40 items-center justify-center">
            <LoadingSpinner size="md" text="Loading authentication..." />
          </div>
        }
      >
        <AuthenticationCard
          isAuthenticated={isAuthenticated}
          needsReauthentication={needsReauthentication}
          onLogin={handleAuthenticate}
          onLogout={handleLogout}
        />
      </Suspense>

      {isAuthenticated && (
        <>
          <Tabs
            defaultValue="dashboard"
            className="mt-6 w-full"
            onValueChange={(value) =>
              setActiveView(value as "dashboard" | "monitoring")
            }
          >
            <div className="mb-4 flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
              </TabsList>

              <div className="text-muted-foreground text-sm">
                {isMonitoring ? (
                  <span className="flex items-center">
                    <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
                    Monitoring active
                  </span>
                ) : (
                  <span className="flex items-center">
                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-gray-400"></span>
                    Monitoring inactive
                  </span>
                )}
              </div>
            </div>

            <TabsContent value="dashboard" className="mt-0">
              <Suspense
                fallback={
                  <div className="flex h-64 items-center justify-center">
                    <LoadingSpinner
                      size="lg"
                      text="Loading dashboard components..."
                    />
                  </div>
                }
              >
                {isLoadingStats ? (
                  <div className="flex h-64 items-center justify-center">
                    <LoadingSpinner
                      size="lg"
                      text="Loading dashboard data..."
                    />
                  </div>
                ) : (
                  <DashboardLayout
                    isLoading={isLoadingStats}
                    statisticsSummary={
                      <StatisticsSummary
                        isLoading={isLoadingStats}
                        totalTracks={stats.totalTracks}
                        totalSkips={stats.totalSkips}
                        skipPercentage={stats.skipPercentage}
                        todaySkips={stats.todaySkips}
                        weekSkips={stats.weekSkips}
                        monthSkips={stats.monthSkips}
                        avgSkipTime={stats.avgSkipTime}
                      />
                    }
                    recentTracks={
                      <RecentTracks
                        isLoading={isLoadingStats}
                        tracks={recentTracks}
                        maxItems={5}
                      />
                    }
                    artistSummary={
                      <ArtistSummary
                        isLoading={isLoadingStats}
                        artists={topArtists}
                        maxItems={5}
                      />
                    }
                    sessionOverview={
                      <SessionOverview
                        isLoading={isLoadingStats}
                        sessions={recentSessions}
                        maxItems={3}
                      />
                    }
                  />
                )}
              </Suspense>
            </TabsContent>

            <TabsContent value="monitoring" className="mt-0">
              <Suspense
                fallback={
                  <LoadingSpinner
                    text="Loading monitoring interface..."
                    size="lg"
                  />
                }
              >
                <MonitoringLayout
                  isLoading={false}
                  nowPlayingCard={
                    <NowPlayingCard
                      isAuthenticated={isAuthenticated}
                      isMonitoring={isMonitoring}
                      playbackInfo={playbackInfo}
                      onPlayPause={handlePlayPause}
                      onPreviousTrack={handlePreviousTrack}
                      onNextTrack={handleNextTrack}
                    />
                  }
                  monitoringCard={
                    <PlaybackMonitoringCard
                      isAuthenticated={isAuthenticated}
                      isMonitoring={isMonitoring}
                      onStartMonitoring={handleStartMonitoring}
                      onStopMonitoring={handleStopMonitoring}
                      monitoringStatus={monitoringStatus}
                      statusMessage={statusMessage}
                      errorDetails={errorDetails}
                    />
                  }
                  logsCard={
                    <LogsCard
                      logs={logs}
                      settings={settings}
                      logSearchTerm={logSearchTerm}
                      onDisplayLogLevelChange={handleDisplayLogLevelChange}
                      onToggleLogAutoRefresh={handleToggleLogAutoRefresh}
                      onLogSearch={handleLogSearch}
                      onClearLogs={handleClearLogs}
                      onOpenLogsDirectory={handleOpenLogsDirectory}
                    />
                  }
                />
              </Suspense>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
