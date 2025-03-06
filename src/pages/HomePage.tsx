import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface PlaybackInfo {
  albumArt: string;
  trackName: string;
  artist: string;
  album: string;
  progress: number;
  duration: number;
  isPlaying: boolean;
  isInPlaylist?: boolean;
}

export default function HomePage() {
  const [playbackInfo, setPlaybackInfo] = useState<PlaybackInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [settings, setSettings] = useState({
    logLevel: "INFO" as "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL",
  });

  // Load settings and logs on component mount
  useEffect(() => {
    const loadSettingsAndLogs = async () => {
      try {
        // Load settings first
        const savedSettings = await window.spotify.getSettings();
        setSettings((prevSettings) => ({
          ...prevSettings,
          logLevel: savedSettings.logLevel,
        }));

        // Then load logs
        const savedLogs = await window.spotify.getLogs();
        setLogs(savedLogs);

        // Check if already authenticated
        const authStatus = await window.spotify.isAuthenticated();
        setIsAuthenticated(authStatus);

        // Check if monitoring is active
        if (authStatus) {
          const isActive = await window.spotify.isMonitoringActive();
          setIsMonitoring(isActive);
        }
      } catch (error) {
        console.error("Failed to load settings or logs:", error);
      }
    };

    loadSettingsAndLogs();

    // Set up a polling interval to refresh logs every second
    const logRefreshInterval = setInterval(async () => {
      try {
        const savedLogs = await window.spotify.getLogs();

        // When new logs arrive, check specifically for any skip messages that might have been missed
        const hasNewSkipMessages = savedLogs.some(
          (log) => log.includes("Track skipped:") && !logs.includes(log),
        );

        if (hasNewSkipMessages) {
          console.log("Found new skip messages in logs");
        }

        setLogs(savedLogs);
      } catch (error) {
        console.error("Failed to refresh logs:", error);
      }
    }, 500); // Refresh twice per second for more responsive skip detection

    // Clean up interval on component unmount
    return () => {
      clearInterval(logRefreshInterval);
    };
  }, []);

  // Set up playback update listener
  useEffect(() => {
    if (isAuthenticated) {
      // Set up listener for playback updates from main process
      const unsubscribe = window.spotify.onPlaybackUpdate((data) => {
        if (data.isPlaying) {
          setPlaybackInfo({
            albumArt: data.albumArt,
            trackName: data.trackName,
            artist: data.artistName,
            album: data.albumName,
            progress: data.progress,
            duration: data.duration,
            isPlaying: data.isPlaying,
            isInPlaylist: data.isInPlaylist,
          });
        } else {
          setPlaybackInfo(null);
        }
      });

      return () => {
        // Clean up listener when component unmounts or auth state changes
        unsubscribe();
      };
    }
  }, [isAuthenticated]);

  // Function to add a log entry - now persists to storage
  const addLog = async (
    message: string,
    level: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL" = "INFO",
  ) => {
    // Save to persistent storage
    await window.spotify.saveLog(message, level);

    // Update state with new log and most recent logs
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;

    setLogs((prevLogs) => {
      // Check if this exact log message already exists in our recent logs
      // This prevents UI duplication, but allow track skipped messages to always show
      if (
        prevLogs.includes(formattedMessage) &&
        !message.includes("Track skipped:")
      ) {
        return prevLogs; // Don't add duplicates
      }

      const newLogs = [...prevLogs, formattedMessage];
      // Keep only the most recent logs in state (match settings)
      if (newLogs.length > 100) {
        return newLogs.slice(-100);
      }
      return newLogs;
    });
  };

  // Authentication functions
  const handleAuthenticate = async () => {
    addLog("Authenticating with Spotify...", "INFO");

    try {
      // Get settings for credentials
      const settings = await window.spotify.getSettings();

      const success = await window.spotify.authenticate({
        clientId: settings.clientId,
        clientSecret: settings.clientSecret,
        redirectUri: settings.redirectUri,
      });

      if (success) {
        setIsAuthenticated(true);
      } else {
        addLog(
          "Authentication failed - check your Spotify credentials in settings",
          "ERROR",
        );
      }
    } catch (error) {
      console.error("Authentication error:", error);
      addLog(`Authentication error occurred: ${error}`, "ERROR");
    }
  };

  const handleLogout = async () => {
    try {
      // Stop monitoring if active
      if (isMonitoring) {
        await handleStopMonitoring();
      }

      await window.spotify.logout();
      setIsAuthenticated(false);
      setPlaybackInfo(null);
    } catch (error) {
      console.error("Logout error:", error);
      addLog("Error during logout", "ERROR");
    }
  };

  // Monitoring functions
  const handleStartMonitoring = async () => {
    try {
      const success = await window.spotify.startMonitoring();
      if (success) {
        setIsMonitoring(true);
        addLog("Started Spotify playback monitoring", "INFO");
      } else {
        addLog("Failed to start monitoring", "ERROR");
      }
    } catch (error) {
      console.error("Error starting monitoring:", error);
      addLog("Error starting monitoring", "ERROR");
    }
  };

  const handleStopMonitoring = async () => {
    try {
      const success = await window.spotify.stopMonitoring();
      if (success) {
        setIsMonitoring(false);
        addLog("Stopped Spotify playback monitoring", "INFO");
      } else {
        addLog("Failed to stop monitoring", "ERROR");
      }
    } catch (error) {
      console.error("Error stopping monitoring:", error);
      addLog("Error stopping monitoring", "ERROR");
    }
  };

  // Clear logs function - now also clears persistent storage
  const handleClearLogs = async () => {
    try {
      await window.spotify.clearLogs();
      setLogs([]);
      addLog("Logs cleared", "INFO");
    } catch (error) {
      console.error("Error clearing logs:", error);
      addLog("Error clearing logs", "ERROR");
    }
  };

  // Format time function
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Helper function to filter logs by level
  const getFilteredLogs = () => {
    const logLevels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"];
    const currentLevelIndex = logLevels.indexOf(settings.logLevel);

    // If we have an invalid log level, just return all logs but ensure they're unique
    if (currentLevelIndex === -1) {
      const uniqueLogs: string[] = [];
      logs.forEach((log) => {
        if (!uniqueLogs.includes(log)) {
          uniqueLogs.push(log);
        }
      });
      // Sort logs by timestamp (expected format: "[timestamp] [LEVEL] message")
      return sortLogsByTimestamp(uniqueLogs);
    }

    // First filter by log level
    const filtered = logs.filter((log) => {
      // Parse log level from log entry (expected format: "[timestamp] [LEVEL] message")
      // The log format is like "[12:34:56] [INFO] Message"
      const levelMatch = log.match(/\[.*?\]\s+\[([A-Z]+)\]/);
      if (!levelMatch) return true; // No level found, include by default

      const logLevel = levelMatch[1];
      const logLevelIndex = logLevels.indexOf(logLevel);

      // Show logs that have level >= current selected level
      return logLevelIndex >= currentLevelIndex;
    });

    // Then remove duplicate logs (same exact content)
    const uniqueLogs: string[] = [];
    filtered.forEach((log) => {
      if (!uniqueLogs.includes(log)) {
        uniqueLogs.push(log);
      }
    });

    // Finally, sort logs by timestamp
    return sortLogsByTimestamp(uniqueLogs);
  };

  // Helper function to sort logs by timestamp
  const sortLogsByTimestamp = (logsToSort: string[]): string[] => {
    return logsToSort.sort((a, b) => {
      // Extract timestamps from log entries
      const timestampA = a.match(/\[(.*?)\]/)?.[1] || "";
      const timestampB = b.match(/\[(.*?)\]/)?.[1] || "";

      // Parse timestamps (format is typically HH:MM:SS)
      const timeA = timestampA.split(":").map(Number);
      const timeB = timestampB.split(":").map(Number);

      // Convert to seconds for comparison
      const secondsA =
        (timeA[0] || 0) * 3600 + (timeA[1] || 0) * 60 + (timeA[2] || 0);
      const secondsB =
        (timeB[0] || 0) * 3600 + (timeB[1] || 0) * 60 + (timeB[2] || 0);

      // Handle day rollover (if timestamps span midnight)
      if (Math.abs(secondsA - secondsB) > 43200) {
        // 12 hours in seconds
        // If the difference is more than 12 hours, assume day rollover
        return secondsA > secondsB ? -1 : 1;
      }

      // Regular chronological comparison
      return secondsA - secondsB;
    });
  };

  // Helper function to get the CSS class for each log level
  const getLogLevelClass = (log: string): string => {
    // Extract log level from the log entry
    const levelMatch = log.match(/\[.*?\]\s+\[([A-Z]+)\]/);
    if (!levelMatch) return "text-gray-500"; // Default color if no level found

    // Apply appropriate color based on log level
    switch (levelMatch[1]) {
      case "DEBUG":
        return "text-slate-500 dark:text-slate-400";
      case "INFO":
        return "text-blue-600 dark:text-blue-400";
      case "WARNING":
        return "text-amber-600 dark:text-amber-400";
      case "ERROR":
        return "text-red-600 dark:text-red-400";
      case "CRITICAL":
        return "text-rose-700 dark:text-rose-400 font-bold";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold">Home</h1>
          <p
            className="text-muted-foreground text-sm uppercase"
            data-testid="pageTitle"
          >
            Dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {isMonitoring ? (
                <Button variant="outline" onClick={handleStopMonitoring}>
                  Stop Monitoring
                </Button>
              ) : (
                <Button variant="outline" onClick={handleStartMonitoring}>
                  Start Monitoring
                </Button>
              )}
              <Button variant="destructive" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <Button onClick={handleAuthenticate}>Connect with Spotify</Button>
          )}
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
        {/* Playback Info */}
        <Card className="flex h-full flex-col">
          <CardContent className="flex flex-1 flex-col p-6">
            {playbackInfo?.isInPlaylist && (
              <div className="mb-4 rounded-md bg-yellow-100 p-3 text-sm text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                This track is part of your library. Skipping will be tracked.
              </div>
            )}

            {playbackInfo ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4">
                <div className="h-48 w-48 overflow-hidden rounded-md">
                  <img
                    src={playbackInfo.albumArt}
                    alt={`${playbackInfo.album} cover`}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="w-full text-center">
                  <h3 className="truncate text-xl font-semibold">
                    {playbackInfo.trackName}
                  </h3>
                  <p className="text-muted-foreground">{playbackInfo.artist}</p>
                  <p className="text-muted-foreground text-sm">
                    {playbackInfo.album}
                  </p>
                </div>

                <div className="w-full space-y-2">
                  <Progress value={playbackInfo.progress} className="h-2" />
                  <div className="flex justify-between text-xs">
                    <span>
                      {formatTime(
                        (playbackInfo.progress / 100) * playbackInfo.duration,
                      )}
                    </span>
                    <span>{formatTime(playbackInfo.duration)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center">
                <p className="text-muted-foreground">
                  {isAuthenticated
                    ? isMonitoring
                      ? "No active playback"
                      : "Monitoring not started"
                    : "Not connected to Spotify"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logs */}
        <Card className="flex h-full flex-col">
          <CardContent className="flex h-full flex-col p-6">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium">Logs</h3>
              </div>
              <div className="flex gap-2">
                <Select
                  value={settings.logLevel}
                  onValueChange={(value) =>
                    setSettings((prev) => ({
                      ...prev,
                      logLevel: value as
                        | "DEBUG"
                        | "INFO"
                        | "WARNING"
                        | "ERROR"
                        | "CRITICAL",
                    }))
                  }
                >
                  <SelectTrigger className="h-8 w-[120px]">
                    <SelectValue placeholder="Log Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEBUG">DEBUG</SelectItem>
                    <SelectItem value="INFO">INFO</SelectItem>
                    <SelectItem value="WARNING">WARNING</SelectItem>
                    <SelectItem value="ERROR">ERROR</SelectItem>
                    <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={handleClearLogs}>
                  Clear
                </Button>
              </div>
            </div>
            <Separator className="mb-2" />
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-[100vh] max-h-[400px]">
                <div className="space-y-1 pr-4 font-mono text-xs">
                  {(() => {
                    const filteredLogs = getFilteredLogs();
                    return filteredLogs.length > 0 ? (
                      filteredLogs.map((log, index) => (
                        <div
                          key={index}
                          className={`py-1 break-all whitespace-pre-wrap ${getLogLevelClass(log)}`}
                        >
                          {log}
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center italic">
                        No logs to display
                      </p>
                    );
                  })()}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
