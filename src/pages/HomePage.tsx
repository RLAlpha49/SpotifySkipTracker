/**
 * Dashboard component for Spotify playback monitoring
 *
 * Provides interfaces for:
 * - Real-time Spotify playback monitoring and metadata display
 * - Authentication and connection management
 * - Application logging with configurable filtering
 * - Playback monitoring controls
 */

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  FolderOpen,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  LucideLogIn,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

/**
 * Interface representing Spotify playback state
 */
interface PlaybackInfo {
  albumArt: string;
  trackName: string;
  artist: string;
  album: string;
  progress: number;
  duration: number;
  currentTimeSeconds?: number;
  isPlaying: boolean;
  isInPlaylist?: boolean;
}

export default function HomePage() {
  const [playbackInfo, setPlaybackInfo] = useState<PlaybackInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [needsReauthentication, setNeedsReauthentication] = useState(false);
  const [settings, setSettings] = useState({
    displayLogLevel: "INFO" as
      | "DEBUG"
      | "INFO"
      | "WARNING"
      | "ERROR"
      | "CRITICAL",
    logAutoRefresh: true,
  });
  const logsRefreshIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
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
  const addLog = async (
    message: string,
    level: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL" = "INFO",
  ) => {
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

  /**
   * Formats seconds to MM:SS format
   *
   * @param seconds - Number of seconds to format
   * @returns Formatted time string in MM:SS format
   */
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  /**
   * Filters and processes logs for display
   * - Parses timestamps for sorting
   * - Groups logs into sessions
   * - Filters by log level and search term
   * - Deduplicates entries
   *
   * @returns Array of filtered log messages
   */
  const getFilteredLogs = () => {
    const logLevels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"];
    const selectedLevelIndex = logLevels.indexOf(settings.displayLogLevel);

    // Parse timestamps and sort logs by timestamp (newest first)
    const parsedLogs = logs.map((log) => {
      const matches = log.match(/\[(.*?)\]\s+\[([A-Z]+)\]\s+(.*)/);
      if (matches && matches.length >= 4) {
        const timestamp = matches[1];
        const level = matches[2];
        const message = matches[3];

        // Parse timestamp into a date object
        const dateParts = timestamp.match(/(\d+):(\d+):(\d+)\s+([AP])M\.(\d+)/);
        let dateObj = null;

        if (dateParts) {
          // Create date for today with the parsed time
          const now = new Date();
          let hours = parseInt(dateParts[1]);
          const minutes = parseInt(dateParts[2]);
          const seconds = parseInt(dateParts[3]);
          const milliseconds = parseInt(dateParts[5]);
          const isPM = dateParts[4] === "P";

          // Convert to 24-hour format
          if (isPM && hours < 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;

          dateObj = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            hours,
            minutes,
            seconds,
            milliseconds,
          );
        }

        return {
          original: log,
          timestamp,
          dateObj,
          level,
          message,
          contentKey: `${level}-${message}`,
        };
      }

      return {
        original: log,
        timestamp: "",
        dateObj: null,
        level: "",
        message: log,
        contentKey: log,
      };
    });

    // Sort by timestamp
    const sortedLogs = parsedLogs.sort((a, b) => {
      if (a.dateObj && b.dateObj) {
        return b.dateObj.getTime() - a.dateObj.getTime();
      }
      return 0;
    });

    // Group logs by session (30 min threshold)
    const sessionBreakThreshold = 30 * 60 * 1000;
    const currentSession = [];
    let previousTime = null;

    for (const log of sortedLogs) {
      if (log.dateObj && previousTime) {
        const timeDiff = previousTime - log.dateObj.getTime();

        if (timeDiff < 0 || timeDiff > sessionBreakThreshold) {
          break;
        }
      }

      currentSession.push(log);
      if (log.dateObj) {
        previousTime = log.dateObj.getTime();
      }
    }

    // Deduplicate logs
    const uniqueSessionLogs = new Map();
    const seenMessages = new Set();

    currentSession.forEach((log) => {
      if (seenMessages.has(log.contentKey)) {
        return;
      }

      seenMessages.add(log.contentKey);
      uniqueSessionLogs.set(log.contentKey, log.original);
    });

    // Filter by log level and search term
    const filteredSessionLogs = Array.from(uniqueSessionLogs.values()).filter(
      (log) => {
        // Filter by log level
        const match = log.match(/\[.*?\]\s+\[([A-Z]+)\]/);
        if (!match) return false;

        const logLevel = match[1];
        const logLevelIndex = logLevels.indexOf(logLevel);

        const levelMatches = logLevelIndex >= selectedLevelIndex;

        // Filter by search term
        const searchMatches =
          !logSearchTerm ||
          log.toLowerCase().includes(logSearchTerm.toLowerCase());

        return levelMatches && searchMatches;
      },
    );

    return filteredSessionLogs;
  };

  /**
   * Determines CSS class based on log level
   *
   * @param log - Log message string
   * @returns CSS class name for styling the log entry
   */
  const getLogLevelClass = (log: string): string => {
    if (log.includes("[DEBUG]")) {
      return "text-muted-foreground";
    } else if (log.includes("[INFO]")) {
      return "text-primary";
    } else if (log.includes("[WARNING]")) {
      return "text-yellow-600 dark:text-yellow-400";
    } else if (log.includes("[ERROR]")) {
      return "text-red-600 dark:text-red-400";
    } else if (log.includes("[CRITICAL]")) {
      return "text-red-700 dark:text-red-300 font-bold";
    }
    return "";
  };

  return (
    <div className="container mx-auto py-4">
      {/* Authentication and connection controls */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-4 text-lg font-semibold">Authentication</h2>
            {isAuthenticated ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-green-600 dark:text-green-400">
                    Connected to Spotify
                  </span>
                  <Button variant="outline" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-red-600 dark:text-red-400">
                    Not connected to Spotify
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => handleAuthenticate()}
                  >
                    <LucideLogIn className="mr-2 h-4 w-4" />
                    Login
                  </Button>
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  {needsReauthentication
                    ? "You've logged out. Click Login to authenticate with Spotify."
                    : "Connect to Spotify to use playback monitoring and controls."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="mb-4 text-lg font-semibold">Playback Monitoring</h2>
            {isAuthenticated ? (
              <div className="flex items-center justify-between">
                <span
                  className={
                    isMonitoring
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }
                >
                  {isMonitoring ? "Monitoring Active" : "Monitoring Inactive"}
                </span>
                {isMonitoring ? (
                  <Button
                    variant="outline"
                    onClick={handleStopMonitoring}
                    disabled={!isAuthenticated}
                  >
                    Stop Monitoring
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartMonitoring}
                    disabled={!isAuthenticated}
                  >
                    Start Monitoring
                  </Button>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">
                Authenticate to enable monitoring
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Current playback display */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <h2 className="mb-4 text-lg font-semibold">Now Playing</h2>
          {playbackInfo && isAuthenticated ? (
            <div>
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="flex-shrink-0">
                  {playbackInfo.albumArt ? (
                    <img
                      src={playbackInfo.albumArt}
                      alt="Album Artwork"
                      className="h-32 w-32 rounded-md object-cover shadow-md"
                    />
                  ) : (
                    <div className="bg-muted text-muted-foreground flex h-32 w-32 items-center justify-center rounded-md text-center text-xs">
                      No Album Art
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <h3 className="text-base font-semibold">
                      {playbackInfo.trackName || "Unknown Track"}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {playbackInfo.artist || "Unknown Artist"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {playbackInfo.album || "Unknown Album"}
                    </p>
                    {playbackInfo.isInPlaylist !== undefined && (
                      <p
                        className={`mt-2 text-xs ${
                          playbackInfo.isInPlaylist
                            ? "text-green-600 dark:text-green-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {playbackInfo.isInPlaylist
                          ? "Track is in your library"
                          : "Track is not in your library"}
                      </p>
                    )}
                  </div>
                  <div className="mt-2">
                    <Progress
                      value={playbackInfo.progress}
                      className="h-1.5 w-full"
                    />
                    <div className="text-muted-foreground mt-1 flex justify-between text-xs">
                      <span>
                        {playbackInfo.currentTimeSeconds !== undefined
                          ? formatTime(playbackInfo.currentTimeSeconds)
                          : formatTime(
                              (playbackInfo.progress / 100) *
                                playbackInfo.duration,
                            )}
                      </span>
                      <span>{formatTime(playbackInfo.duration)}</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Playback Controls */}
              <div className="mt-3 flex justify-center space-x-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousTrack}
                  disabled={!isAuthenticated || !isMonitoring}
                  title="Previous Track"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePlayPause}
                  disabled={!isAuthenticated || !isMonitoring}
                  title={playbackInfo.isPlaying ? "Pause" : "Play"}
                >
                  {playbackInfo.isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextTrack}
                  disabled={!isAuthenticated || !isMonitoring}
                  title="Next Track"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">
              {isAuthenticated
                ? "No track currently playing"
                : "Connect to Spotify to see playback information"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Application logs interface */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Activity Logs</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenLogsDirectory}
                  title="Open logs directory in file explorer"
                  className="flex items-center gap-1"
                >
                  <FolderOpen className="h-4 w-4" />
                  <span>Open Logs</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleClearLogs}>
                  Clear Logs
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <Label className="mb-1 text-xs">Display Filter</Label>
                  <Select
                    value={settings.displayLogLevel}
                    onValueChange={handleDisplayLogLevelChange}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Display Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEBUG">DEBUG</SelectItem>
                      <SelectItem value="INFO">INFO</SelectItem>
                      <SelectItem value="WARNING">WARNING</SelectItem>
                      <SelectItem value="ERROR">ERROR</SelectItem>
                      <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="log-auto-refresh"
                    checked={settings.logAutoRefresh}
                    onCheckedChange={handleToggleLogAutoRefresh}
                  />
                  <Label htmlFor="log-auto-refresh">Auto-refresh</Label>
                </div>

                <Input
                  type="text"
                  placeholder="Search logs..."
                  value={logSearchTerm}
                  onChange={handleLogSearch}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <Separator className="my-2" />
          <ScrollArea className="h-60 w-full rounded-md border p-4">
            {(() => {
              const filteredLogs = getFilteredLogs();
              return filteredLogs.length > 0 ? (
                <div className="space-y-1">
                  {filteredLogs.map((log, index) => (
                    <div
                      key={index}
                      className={`py-0.5 font-mono text-xs ${getLogLevelClass(log)}`}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center text-sm">
                  No logs to display
                </p>
              );
            })()}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
