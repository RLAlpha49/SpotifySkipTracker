import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music,
  ExternalLink,
  Heart,
} from "lucide-react";
import { PlaybackInfo } from "@/types/spotify";
import { Badge } from "@/components/ui/badge";

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
    <Card className="border-muted-foreground/20 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-xl font-semibold">
          <Music className="text-primary mr-2 h-5 w-5" />
          Now Playing
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {playbackInfo && isAuthenticated ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-6 sm:flex-row">
              <div className="flex-shrink-0">
                {playbackInfo.albumArt ? (
                  <div className="group relative">
                    <img
                      src={playbackInfo.albumArt}
                      alt="Album Artwork"
                      className="h-32 w-32 rounded-md object-cover shadow-md transition-all group-hover:shadow-lg"
                    />
                    {playbackInfo.isPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                        <ExternalLink className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-muted/60 flex h-32 w-32 items-center justify-center rounded-md text-center">
                    <Music className="text-muted-foreground/60 h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">
                      {playbackInfo.trackName || "Unknown Track"}
                    </h3>
                    {playbackInfo.isInPlaylist !== undefined && (
                      <Badge
                        variant="outline"
                        className={
                          playbackInfo.isInPlaylist
                            ? "flex items-center gap-1 border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-muted/50 text-muted-foreground flex items-center gap-1"
                        }
                      >
                        <Heart
                          className={`h-3 w-3 ${playbackInfo.isInPlaylist ? "fill-green-600 dark:fill-green-400" : ""}`}
                        />
                        {playbackInfo.isInPlaylist
                          ? "In Library"
                          : "Not in Library"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">
                    {playbackInfo.artist || "Unknown Artist"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {playbackInfo.album || "Unknown Album"}
                  </p>
                </div>
                <div className="mt-4">
                  <Progress
                    value={playbackInfo.progress}
                    className="bg-muted/60 h-1.5 w-full"
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
            <div className="flex items-center justify-center space-x-4 pt-3 pb-1">
              <Button
                variant="outline"
                size="icon"
                onClick={onPreviousTrack}
                disabled={!isAuthenticated || !isMonitoring}
                title="Previous Track"
                className="flex h-10 w-10 items-center justify-center rounded-full"
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button
                variant={playbackInfo.isPlaying ? "default" : "outline"}
                size="icon"
                onClick={onPlayPause}
                disabled={!isAuthenticated || !isMonitoring}
                title={playbackInfo.isPlaying ? "Pause" : "Play"}
                className={`flex h-12 w-12 items-center justify-center rounded-full ${playbackInfo.isPlaying ? "bg-primary text-primary-foreground" : ""}`}
              >
                {playbackInfo.isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="ml-0.5 h-5 w-5" />
                )}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={onNextTrack}
                disabled={!isAuthenticated || !isMonitoring}
                title="Next Track"
                className="flex h-10 w-10 items-center justify-center rounded-full"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex h-32 flex-col items-center justify-center text-center">
            <Music className="text-muted-foreground/30 mb-3 h-12 w-12" />
            <p className="text-muted-foreground">
              {isAuthenticated
                ? "No track currently playing"
                : "Connect to Spotify to see playback information"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
