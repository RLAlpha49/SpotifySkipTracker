/**
 * Home Page Component
 *
 * This is the main dashboard of the application, showing:
 * - Current Spotify playback information with album art and progress
 * - Authentication status and controls
 * - Playback monitoring controls (start/stop)
 * - Application logs with filtering by log level
 *
 * The component manages multiple states:
 * - Current playback information from Spotify
 * - Authentication status
 * - Monitoring status
 * - Application logs
 * - User settings
 */

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { FolderOpen } from "lucide-react";
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
 * Information about the currently playing Spotify track
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
  // State for current playback information
  const [playbackInfo, setPlaybackInfo] = useState<PlaybackInfo | null>(null);
  // State for application logs
  const [logs, setLogs] = useState<string[]>([]);
  // State for authentication status
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // State for monitoring status
  const [isMonitoring, setIsMonitoring] = useState(false);
  // State for user settings
  const [settings, setSettings] = useState({
    displayLogLevel: "INFO" as
      | "DEBUG"
      | "INFO"
      | "WARNING"
      | "ERROR"
      | "CRITICAL", // For display filtering only
    logAutoRefresh: true,
  });
  // Reference for the logs refresh interval
  const logsRefreshIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  // State for log searching
  const [logSearchTerm, setLogSearchTerm] = useState("");

  /**
   * Get initial playback information
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
   * Load settings, logs, and check authentication status on component mount
   */
  useEffect(() => {
    const loadSettingsAndLogs = async () => {
      try {
        // Load settings first
        const savedSettings = await window.spotify.getSettings();
        setSettings((prevSettings) => ({
          ...prevSettings,
          displayLogLevel: savedSettings.displayLogLevel || "INFO",
          logAutoRefresh: savedSettings.logAutoRefresh !== false,
        }));

        // Then load logs
        const savedLogs = await window.spotify.getLogs();
        setLogs(savedLogs);

        // Check if already authenticated
        const authStatus = await window.spotify.isAuthenticated();
        setIsAuthenticated(authStatus);

        // If authenticated, check if monitoring is active or should be auto-started
        if (authStatus) {
          const monitoringStatus = await window.spotify.isMonitoringActive();
          setIsMonitoring(monitoringStatus);

          // Auto-start monitoring if configured and not already active
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

    // Start playback updates if authenticated
    getInitialPlayback();

    // Start auto-refresh for logs
    startLogsRefresh();

    // Clean up on unmount
    return () => {
      if (logsRefreshIntervalRef.current) {
        clearInterval(logsRefreshIntervalRef.current);
        logsRefreshIntervalRef.current = null;
      }
    };
  }, []);

  /**
   * Start automatic logs refresh at regular intervals
   */
  const startLogsRefresh = () => {
    // Clear any existing interval
    if (logsRefreshIntervalRef.current) {
      clearInterval(logsRefreshIntervalRef.current);
    }

    // Only start if auto-refresh is enabled
    if (!settings.logAutoRefresh) {
      return;
    }

    // Create new interval to refresh logs every 500ms
    logsRefreshIntervalRef.current = setInterval(async () => {
      try {
        const updatedLogs = await window.spotify.getLogs();
        setLogs(updatedLogs);
      } catch (error) {
        console.error("Error refreshing logs:", error);
        // Don't log this error to avoid recursive error logs
      }
    }, 500);
  };

  /**
   * Set up playback update listener when authenticated
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    // Subscribe to playback updates from Spotify
    const unsubscribe = window.spotify.onPlaybackUpdate((data) => {
      // Check if monitoring was stopped due to API errors
      if (data.monitoringStopped) {
        // Update UI to show monitoring has stopped
        setIsMonitoring(false);

        // Clear the playback information
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

        // Notify the user
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

    // Get initial playback state
    getInitialPlayback();

    // Cleanup: unsubscribe when component unmounts
    return () => {
      unsubscribe();
    };
  }, [isAuthenticated]);

  /**
   * Save a log message and update the logs state
   *
   * @param message - The log message to save
   * @param level - The severity level of the log
   */
  const addLog = async (
    message: string,
    level: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL" = "INFO",
  ) => {
    try {
      // Save log to storage - filtering by level is done on the backend using fileLogLevel
      await window.spotify.saveLog(message, level);

      // Update logs in state
      const updatedLogs = await window.spotify.getLogs();
      setLogs(updatedLogs);
    } catch (error) {
      console.error("Error saving log:", error);
    }
  };

  /**
   * Handle display log level change from dropdown
   *
   * @param value - The new log level for display filtering
   */
  const handleDisplayLogLevelChange = async (value: string) => {
    try {
      // Update settings state
      setSettings((prev) => ({
        ...prev,
        displayLogLevel: value as
          | "DEBUG"
          | "INFO"
          | "WARNING"
          | "ERROR"
          | "CRITICAL",
      }));

      // Get current settings first
      const currentSettings = await window.spotify.getSettings();

      // Update only the display log level
      await window.spotify.saveSettings({
        ...currentSettings,
        displayLogLevel: value as
          | "DEBUG"
          | "INFO"
          | "WARNING"
          | "ERROR"
          | "CRITICAL",
      });

      // Log the change
      addLog(`Display log level changed to ${value}`, "DEBUG");
    } catch (error) {
      console.error("Error changing display log level:", error);
      addLog(`Error changing display log level: ${error}`, "ERROR");
    }
  };

  /**
   * Toggle auto-refresh for logs
   */
  const handleToggleLogAutoRefresh = async () => {
    try {
      // Toggle the setting
      const newAutoRefresh = !settings.logAutoRefresh;

      // Update local state
      setSettings((prev) => ({
        ...prev,
        logAutoRefresh: newAutoRefresh,
      }));

      // Get current settings
      const currentSettings = await window.spotify.getSettings();

      // Save the new setting
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
   * Handle log search
   *
   * @param event - Input change event
   */
  const handleLogSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLogSearchTerm(event.target.value);
  };

  /**
   * Handle authentication with Spotify
   */
  const handleAuthenticate = async () => {
    try {
      // Show authentication in progress
      addLog("Authenticating with Spotify...", "INFO");

      // Get current settings to access credentials
      const currentSettings = await window.spotify.getSettings();

      // Make sure we have the required credentials
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

      // Attempt authentication with explicit credentials
      const success = await window.spotify.authenticate({
        clientId: currentSettings.clientId,
        clientSecret: currentSettings.clientSecret,
        redirectUri:
          currentSettings.redirectUri || "http://localhost:8888/callback",
      });

      if (success) {
        // Update authentication state
        setIsAuthenticated(true);
        addLog("Authentication successful", "INFO");

        // Auto-start monitoring if configured
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
   * Handle logout from Spotify
   */
  const handleLogout = async () => {
    try {
      // Show logout in progress
      addLog("Logging out from Spotify...", "INFO");

      // Stop monitoring if active
      if (isMonitoring) {
        await handleStopMonitoring();
      }

      // Attempt logout
      const success = await window.spotify.logout();

      if (success) {
        // Update authentication state
        setIsAuthenticated(false);

        // Set playback info to logged-out state
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
   * Start monitoring Spotify playback
   */
  const handleStartMonitoring = async () => {
    try {
      // Show monitoring start in progress
      addLog("Starting Spotify playback monitoring...", "INFO");

      // Attempt to start monitoring
      const success = await window.spotify.startMonitoring();

      if (success) {
        // Update monitoring state
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
   * Stop monitoring Spotify playback
   */
  const handleStopMonitoring = async () => {
    try {
      // Show monitoring stop in progress
      addLog("Stopping Spotify playback monitoring...", "INFO");

      // Attempt to stop monitoring
      const success = await window.spotify.stopMonitoring();

      if (success) {
        // Update monitoring state
        setIsMonitoring(false);

        // Clear the playback information to indicate monitoring is stopped
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
   * Handle clearing logs
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
   * Handle opening logs directory in file explorer
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
   * Format seconds into MM:SS format
   *
   * @param seconds - Number of seconds to format
   * @returns Formatted time string
   */
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  /**
   * Filter logs based on the selected log level
   *
   * @returns Filtered and sorted array of log messages
   */
  const getFilteredLogs = () => {
    const logLevels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"];
    const selectedLevelIndex = logLevels.indexOf(settings.displayLogLevel);

    // Step 1: Parse timestamps and sort logs by timestamp (newest first)
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

    // Step 2: Sort by timestamp
    const sortedLogs = parsedLogs.sort((a, b) => {
      if (a.dateObj && b.dateObj) {
        return b.dateObj.getTime() - a.dateObj.getTime();
      }
      return 0;
    });

    // Step 3: Group logs by session
    // A session break is detected by a large time gap (e.g., >30 minutes)
    // or by looking at timestamps that go backward (e.g., 10 PM back to 4 PM)
    const sessionBreakThreshold = 30 * 60 * 1000; // 30 minutes in milliseconds
    const currentSession = [];
    let previousTime = null;

    for (const log of sortedLogs) {
      if (log.dateObj && previousTime) {
        const timeDiff = previousTime - log.dateObj.getTime();

        // If time goes backwards significantly (more than 30 minutes) or forward by a large gap,
        // consider it a new session
        if (timeDiff < 0 || timeDiff > sessionBreakThreshold) {
          break; // Stop processing, we've found the current session
        }
      }

      currentSession.push(log);
      if (log.dateObj) {
        previousTime = log.dateObj.getTime();
      }
    }

    // Step 4: Deduplicate logs
    const uniqueSessionLogs = new Map();
    const seenMessages = new Set();

    currentSession.forEach((log) => {
      // Skip duplicates
      if (seenMessages.has(log.contentKey)) {
        return;
      }

      seenMessages.add(log.contentKey);
      uniqueSessionLogs.set(log.contentKey, log.original);
    });

    // Step 5: Filter by log level and search term
    const filteredSessionLogs = Array.from(uniqueSessionLogs.values()).filter(
      (log) => {
        // First filter by log level
        const match = log.match(/\[.*?\]\s+\[([A-Z]+)\]/);
        if (!match) return false;

        const logLevel = match[1];
        const logLevelIndex = logLevels.indexOf(logLevel);

        const levelMatches = logLevelIndex >= selectedLevelIndex;

        // Then filter by search term if one exists
        const searchMatches =
          !logSearchTerm ||
          log.toLowerCase().includes(logSearchTerm.toLowerCase());

        return levelMatches && searchMatches;
      },
    );

    // Return filtered session logs (already in the right order)
    return filteredSessionLogs;
  };

  /**
   * Get CSS class for log entry based on its level
   *
   * @param log - Log message string
   * @returns CSS class string for styling
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
      {/* Authentication and Monitoring Controls */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-4 text-lg font-semibold">Authentication</h2>
            {isAuthenticated ? (
              <div className="flex items-center justify-between">
                <span className="text-green-600 dark:text-green-400">
                  Connected to Spotify
                </span>
                <Button variant="outline" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-red-600 dark:text-red-400">
                  Not connected to Spotify
                </span>
                <Button onClick={handleAuthenticate}>Connect</Button>
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

      {/* Now Playing Section */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <h2 className="mb-4 text-lg font-semibold">Now Playing</h2>
          {playbackInfo && isAuthenticated ? (
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
          ) : (
            <p className="text-muted-foreground">
              {isAuthenticated
                ? "No track currently playing"
                : "Connect to Spotify to see playback information"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Logs Section */}
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
