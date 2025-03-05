import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  // Load logs on component mount
  useEffect(() => {
    const loadLogs = async () => {
      try {
        const savedLogs = await window.spotify.getLogs();
        setLogs(savedLogs);
      } catch (error) {
        console.error("Failed to load logs:", error);
      }
    };

    loadLogs();
  }, []);

  // Mock function to load playback data - would be replaced with actual Electron IPC
  useEffect(() => {
    const mockPlaybackInterval = setInterval(() => {
      if (isAuthenticated) {
        // Mock fetching playback info
        const mockIsPlaying = Math.random() > 0.3;
        if (mockIsPlaying) {
          const mockProgress = Math.floor(Math.random() * 100);
          const isInPlaylist = Math.random() > 0.5; // Randomly determine if in playlist

          setPlaybackInfo({
            albumArt:
              "https://i.scdn.co/image/ab67616d0000b2731290d2196e9874d4060f0764",
            trackName: "Lorem Ipsum Track",
            artist: "Artist Name",
            album: "Album Title",
            progress: mockProgress,
            duration: 100,
            isPlaying: true,
            isInPlaylist,
          });

          // Add log
          addLog(
            `Now playing: Lorem Ipsum Track by Artist Name${isInPlaylist ? " (in playlist)" : ""}`,
          );
        } else {
          setPlaybackInfo(null);
          addLog("No active playback detected");
        }
      }
    }, 5000);

    return () => clearInterval(mockPlaybackInterval);
  }, [isAuthenticated]);

  // Function to add a log entry - now persists to storage
  const addLog = async (message: string) => {
    // Save to persistent storage
    await window.spotify.saveLog(message);

    // Update state with new log and most recent logs
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${message}`;

    setLogs((prevLogs) => {
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
    // This would be replaced with actual Electron-to-main process authentication
    addLog("Authenticating with Spotify...");

    try {
      const success = await window.spotify.authenticate({
        clientId: "mock-client-id",
        clientSecret: "mock-client-secret",
        redirectUri: "http://localhost:8888/callback",
      });
      if (success) {
        setIsAuthenticated(true);
        addLog("Successfully authenticated with Spotify");
      } else {
        addLog("Authentication failed");
      }
    } catch (error) {
      console.error("Authentication error:", error);
      addLog("Authentication error occurred");
    }
  };

  const handleLogout = async () => {
    try {
      await window.spotify.logout();
      setIsAuthenticated(false);
      setPlaybackInfo(null);
      addLog("Logged out from Spotify");
    } catch (error) {
      console.error("Logout error:", error);
      addLog("Error during logout");
    }
  };

  // Clear logs function - now also clears persistent storage
  const handleClearLogs = async () => {
    try {
      await window.spotify.clearLogs();
      setLogs([]);
      addLog("Logs cleared");
    } catch (error) {
      console.error("Error clearing logs:", error);
    }
  };

  // Format time function
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
            <Button variant="destructive" onClick={handleLogout}>
              Logout
            </Button>
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
                This track is part of a playlist. Skipping will be tracked.
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
                    ? "No active playback"
                    : "Not connected to Spotify"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logs */}
        <Card className="flex h-full flex-col">
          <CardContent className="flex flex-1 flex-col p-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-medium">Logs</h3>
              <Button variant="outline" size="sm" onClick={handleClearLogs}>
                Clear
              </Button>
            </div>
            <Separator className="mb-2" />
            <ScrollArea className="flex-1">
              <div className="space-y-1 font-mono text-xs">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div
                      key={index}
                      className="py-1 break-all whitespace-pre-wrap"
                    >
                      {log}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center italic">
                    No logs to display
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
