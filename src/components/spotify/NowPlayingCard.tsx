import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { PlaybackInfo } from "@/types/spotify";

interface NowPlayingCardProps {
  isAuthenticated: boolean;
  isMonitoring: boolean;
  playbackInfo: PlaybackInfo | null;
  onPlayPause: () => Promise<void>;
  onPreviousTrack: () => Promise<void>;
  onNextTrack: () => Promise<void>;
}

export function NowPlayingCard({
  isAuthenticated,
  isMonitoring,
  playbackInfo,
  onPlayPause,
  onPreviousTrack,
  onNextTrack,
}: NowPlayingCardProps) {
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

  return (
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
                onClick={onPreviousTrack}
                disabled={!isAuthenticated || !isMonitoring}
                title="Previous Track"
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={onPlayPause}
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
                onClick={onNextTrack}
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
  );
}
