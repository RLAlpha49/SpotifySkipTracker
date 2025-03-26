/**
 * Dashboard component for Spotify playback monitoring
 *
 * Provides interfaces for:
 * - Real-time Spotify playback monitoring and metadata display
 * - Authentication and connection management
 * - Application logging with configurable filtering
 * - Playback monitoring controls
 */

import { MonitoringStatus } from "@/components/spotify/PlaybackMonitoringCard";
import { LoadingSpinner } from "@/components/ui/spinner";
import { LogLevel } from "@/types/logging";
import { LogSettings, PlaybackInfo } from "@/types/spotify";
import { MusicIcon } from "lucide-react";
import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
            "Failed to load playback monitoring component",
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
            "Failed to load now playing component",
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

  /**
   * Fetches current playback information from Spotify API
   *
   * @returns Promise<void>
   */
  const getInitialPlayback = async () => {
    if (!isAuthenticated) return;

    try {
      const playback = await window.spotify.getCurrentPlayback();
      if (playback) {
        setPlaybackInfo({
          albumArt: playback.albumArt,
          trackName: playback.trackName,
          artist: playback.artistName,
          album: playback.albumName,
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
   * Initializes component on mount
   * - Loads application settings
   * - Checks authentication status
   * - Starts log refresh if enabled
   */
  useEffect(() => {
    const loadSettingsAndLogs = async () => {
      try {
        const savedSettings = await window.spotify.getSettings();
        setSettings((prevSettings) => ({
          ...prevSettings,
          displayLogLevel: savedSettings.displayLogLevel || "INFO",
          logAutoRefresh: savedSettings.logAutoRefresh !== false,
        }));

        const savedLogs = await window.spotify.getLogs();
        setLogs(savedLogs);

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
        } else {
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
        artist: data.artistName,
        album: data.albumName,
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
   * Authenticates with Spotify API
   *
   * @returns Promise<void>
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
    <div className="container mx-auto max-w-5xl py-8">
      <div className="mb-8 border-b pb-4">
        <h1 className="flex items-center text-3xl font-bold tracking-tight">
          <MusicIcon className="text-primary mr-3 h-8 w-8" />
          Spotify Skip Tracker
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor your Spotify playback and identify frequently skipped tracks
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Suspense
            fallback={
              <div className="bg-muted/30 flex h-40 animate-pulse items-center justify-center rounded-lg border p-6 shadow-sm">
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

          <Suspense
            fallback={
              <div className="bg-muted/30 flex h-40 animate-pulse items-center justify-center rounded-lg border p-6 shadow-sm">
                <LoadingSpinner size="md" text="Loading playback controls..." />
              </div>
            }
          >
            <PlaybackMonitoringCard
              isAuthenticated={isAuthenticated}
              isMonitoring={isMonitoring}
              monitoringStatus={monitoringStatus}
              statusMessage={statusMessage}
              errorDetails={errorDetails}
              onStartMonitoring={handleStartMonitoring}
              onStopMonitoring={handleStopMonitoring}
            />
          </Suspense>
        </div>

        {(isAuthenticated || playbackInfo) && (
          <Suspense
            fallback={
              <div className="bg-muted/30 flex h-52 animate-pulse items-center justify-center rounded-lg border p-6 shadow-sm">
                <LoadingSpinner size="md" text="Loading now playing..." />
              </div>
            }
          >
            <NowPlayingCard
              isAuthenticated={isAuthenticated}
              isMonitoring={isMonitoring}
              playbackInfo={playbackInfo}
              onPlayPause={handlePlayPause}
              onPreviousTrack={handlePreviousTrack}
              onNextTrack={handleNextTrack}
            />
          </Suspense>
        )}

        <Suspense
          fallback={
            <div className="bg-muted/30 flex h-96 animate-pulse items-center justify-center rounded-lg border p-6 shadow-sm">
              <LoadingSpinner size="md" text="Loading logs..." />
            </div>
          }
        >
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
        </Suspense>
      </div>
    </div>
  );
}
