/**
 * Dashboard component for Spotify playback monitoring
 *
 * Provides interfaces for:
 * - Real-time Spotify playback monitoring and metadata display
 * - Authentication and connection management
 * - Application logging with configurable filtering
 * - Playback monitoring controls
 */

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { PlaybackInfo, LogSettings } from "@/types/spotify";
import { LogLevel } from "@/types/logging";
import { AuthenticationCard } from "@/components/spotify/AuthenticationCard";
import { PlaybackMonitoringCard } from "@/components/spotify/PlaybackMonitoringCard";
import { NowPlayingCard } from "@/components/spotify/NowPlayingCard";
import { LogsCard } from "@/components/spotify/LogsCard";

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

        if (authStatus) {
          const monitoringStatus = await window.spotify.isMonitoringActive();
          setIsMonitoring(monitoringStatus);

          if (savedSettings.autoStartMonitoring && !monitoringStatus) {
            addLog("Auto-starting Spotify playback monitoring...", "DEBUG");
            const success = await window.spotify.startMonitoring();
            if (success) {
              setIsMonitoring(true);
              addLog("Monitoring auto-started successfully", "INFO");
            } else {
              addLog("Failed to auto-start monitoring", "ERROR");
            }
          }
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
   * Saves log message and updates logs state
   *
   * @param message - Message content to log
   * @param level - Severity level for the log
   * @returns Promise<void>
   */
  const addLog = async (message: string, level: LogLevel = "INFO") => {
    try {
      await window.spotify.saveLog(message, level);
      const updatedLogs = await window.spotify.getLogs();
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
      setSettings((prev) => ({
        ...prev,
        logAutoRefresh: newAutoRefresh,
      }));

      const currentSettings = await window.spotify.getSettings();
      await window.spotify.saveSettings({
        ...currentSettings,
        logAutoRefresh: newAutoRefresh,
      });

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
      // Always clear cookies to ensure fresh login
      toast.info("Connecting to Spotify", {
        description: "Clearing session data and opening Spotify login...",
      });
      addLog("Authenticating with Spotify - clearing auth cookies", "INFO");

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

      // Always force re-authentication to ensure a fresh login
      const shouldForceAuth = true;

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
            addLog("Monitoring auto-started successfully", "INFO");
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
      addLog("Starting Spotify playback monitoring...", "INFO");
      const success = await window.spotify.startMonitoring();

      if (success) {
        setIsMonitoring(true);
      } else {
        addLog("Failed to start monitoring", "ERROR");
      }
    } catch (error) {
      console.error("Error starting monitoring:", error);
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
      addLog("Stopping Spotify playback monitoring...", "INFO");
      const success = await window.spotify.stopMonitoring();

      if (success) {
        setIsMonitoring(false);
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
        addLog("Failed to stop monitoring", "ERROR");
      }
    } catch (error) {
      console.error("Error stopping monitoring:", error);
      addLog(`Error stopping monitoring: ${error}`, "ERROR");
    }
  };

  /**
   * Clears application logs
   *
   * @returns Promise<void>
   */
  const handleClearLogs = async () => {
    try {
      const result = await window.spotify.clearLogs();
      if (result) {
        addLog("Logs cleared", "INFO");
      } else {
        addLog("Failed to clear logs", "ERROR");
      }
    } catch (error) {
      console.error("Error clearing logs:", error);
      addLog(`Error clearing logs: ${error}`, "ERROR");
    }
  };

  /**
   * Opens log directory in file explorer
   *
   * @returns Promise<void>
   */
  const handleOpenLogsDirectory = async () => {
    try {
      await window.spotify.openLogsDirectory();
    } catch (error) {
      console.error("Error opening logs directory:", error);
      addLog(`Error opening logs directory: ${error}`, "ERROR");
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
    <div className="container mx-auto py-4">
      {/* Authentication and connection controls */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <AuthenticationCard
          isAuthenticated={isAuthenticated}
          needsReauthentication={needsReauthentication}
          onLogin={handleAuthenticate}
          onLogout={handleLogout}
        />

        <PlaybackMonitoringCard
          isAuthenticated={isAuthenticated}
          isMonitoring={isMonitoring}
          onStartMonitoring={handleStartMonitoring}
          onStopMonitoring={handleStopMonitoring}
        />
      </div>

      {/* Current playback display */}
      <NowPlayingCard
        isAuthenticated={isAuthenticated}
        isMonitoring={isMonitoring}
        playbackInfo={playbackInfo}
        onPlayPause={handlePlayPause}
        onPreviousTrack={handlePreviousTrack}
        onNextTrack={handleNextTrack}
      />

      {/* Application logs interface */}
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
    </div>
  );
}
