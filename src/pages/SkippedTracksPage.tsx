/**
 * SkippedTracksPage Component
 *
 * Analyzes and manages frequently skipped tracks with features including:
 * - Statistical analysis of skip patterns
 * - Library management actions for skipped tracks
 * - Bulk operations for filtered content
 * - Automatic removal of frequently skipped tracks
 *
 * Uses configurable thresholds to identify candidates for library cleanup
 * based on skip frequency within specified timeframes.
 */

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { FolderOpen, Trash2, MoreVertical, XCircle } from "lucide-react";
import { SpotifySettings } from "./SettingsPage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Track data with skip statistics and metadata
 */
type SkippedTrack = {
  id: string;
  name: string;
  artist: string;
  skipCount: number;
  notSkippedCount: number;
  lastSkipped: string;
  skipTimestamps?: string[];
  autoProcessed?: boolean;
};

export default function SkippedTracksPage() {
  const [skippedTracks, setSkippedTracks] = useState<SkippedTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeframeInDays, setTimeframeInDays] = useState(30);
  const [skipThreshold, setSkipThreshold] = useState(3);
  const [autoUnlike, setAutoUnlike] = useState(true);

  /**
   * Fetches skipped tracks and initializes component state with user settings
   */
  const loadSkippedData = async () => {
    setLoading(true);
    try {
      const tracks = await window.spotify.getSkippedTracks();

      const settings = (await window.spotify.getSettings()) as SpotifySettings;
      setTimeframeInDays(settings.timeframeInDays || 30);
      setSkipThreshold(settings.skipThreshold || 3);
      setAutoUnlike(settings.autoUnlike !== false);

      setSkippedTracks(tracks);
    } catch (error) {
      console.error("Failed to load skipped tracks:", error);
      toast.error("Failed to load data", {
        description: "Could not load skipped tracks data.",
      });
      window.spotify.saveLog(`Error loading skipped tracks: ${error}`, "ERROR");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculates skips within the configured time window
   *
   * @param track - Track to analyze for recent skips
   * @returns Number of skips within the timeframe
   */
  const getRecentSkipCount = (track: SkippedTrack): number => {
    if (!track.skipTimestamps || track.skipTimestamps.length === 0) {
      return track.skipCount;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframeInDays);

    return track.skipTimestamps.filter((timestamp) => {
      const skipDate = new Date(timestamp);
      return skipDate >= cutoffDate;
    }).length;
  };

  /**
   * Evaluates if a track exceeds the skip threshold
   *
   * @param track - Track to evaluate against threshold
   * @returns Boolean indicating if track should be suggested for removal
   */
  const shouldSuggestRemoval = (track: SkippedTrack): boolean => {
    try {
      const recentSkips = getRecentSkipCount(track);
      return recentSkips >= skipThreshold;
    } catch (error) {
      console.error("Error calculating skip suggestion:", error);
      return false;
    }
  };

  /**
   * Processes tracks for automatic removal based on skip threshold
   * Only runs when autoUnlike setting is enabled
   */
  const checkForAutoUnlike = async () => {
    if (!autoUnlike) return;

    try {
      const tracksToUnlike = skippedTracks.filter(shouldSuggestRemoval);
      if (tracksToUnlike.length === 0) return;

      const removedTrackIds: string[] = [];

      for (const track of tracksToUnlike) {
        try {
          if (track.autoProcessed) continue;

          const unlikeSuccess = await window.spotify.unlikeTrack(track.id);

          if (unlikeSuccess) {
            window.spotify.saveLog(
              `Auto-removed track ${track.id} "${track.name}" from library (${getRecentSkipCount(track)} skips)`,
              "INFO",
            );

            const removeSuccess = await removeFromSkippedData(track.id);

            if (removeSuccess) {
              removedTrackIds.push(track.id);
              window.spotify.saveLog(
                `Removed track ${track.id} from skipped data`,
                "INFO",
              );
            }

            track.autoProcessed = true;

            // Limit notifications to avoid flooding
            if (tracksToUnlike.indexOf(track) < 3) {
              toast.success("Track auto-removed", {
                description: `"${track.name}" by ${track.artist} was automatically removed from your library${removeSuccess ? " and skipped tracks" : ""}.`,
              });
            } else if (tracksToUnlike.indexOf(track) === 3) {
              toast.info(
                `${tracksToUnlike.length - 3} more tracks were automatically removed`,
                {
                  description: "Check logs for details.",
                },
              );
            }
          }
        } catch (error) {
          console.error(`Error auto-unliking track ${track.id}:`, error);
        }
      }

      if (removedTrackIds.length > 0) {
        setSkippedTracks((prev) =>
          prev.filter((track) => !removedTrackIds.includes(track.id)),
        );
      } else {
        await loadSkippedData();
      }
    } catch (error) {
      console.error("Error in auto-unlike process:", error);
    }
  };

  /**
   * Opens the data directory containing skip tracking files
   */
  const handleOpenSkipsDirectory = async () => {
    try {
      await window.spotify.openSkipsDirectory();
    } catch (error) {
      console.error("Failed to open skip data folder:", error);
      toast.error("Failed to open skip data folder", {
        description: "Could not open the folder where skip data is saved.",
      });
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadSkippedData();
  }, []);

  // Run auto-unlike when relevant state changes
  useEffect(() => {
    if (skippedTracks.length > 0) {
      checkForAutoUnlike();
    }
  }, [skippedTracks, autoUnlike, skipThreshold]);

  /**
   * Calculates percentage of skips relative to total plays
   *
   * @param track - Track to calculate skip ratio for
   * @returns Formatted percentage string
   */
  const calculateSkipRatio = (track: SkippedTrack): string => {
    const totalPlays = track.skipCount + track.notSkippedCount;
    if (totalPlays === 0) return "0%";

    const ratio = (track.skipCount / totalPlays) * 100;
    return `${ratio.toFixed(0)}%`;
  };

  /**
   * Formats ISO date string to localized date and time
   *
   * @param dateString - ISO timestamp string
   * @returns Human-readable formatted date string
   */
  const formatDate = (dateString: string): string => {
    if (!dateString) return "Never";

    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  /**
   * Comparison function for sorting tracks by skip frequency
   *
   * @param a - First track to compare
   * @param b - Second track to compare
   * @returns Sort value (-1, 0, 1) for array sorting
   */
  const sortBySkipCount = (a: SkippedTrack, b: SkippedTrack): number => {
    const recentSkipsA = getRecentSkipCount(a);
    const recentSkipsB = getRecentSkipCount(b);

    if (recentSkipsB !== recentSkipsA) {
      return recentSkipsB - recentSkipsA;
    }

    return b.skipCount - a.skipCount;
  };

  /**
   * Removes track from skip tracking database only
   *
   * @param trackId - Spotify track ID to remove from tracking
   * @returns Promise resolving to success status
   */
  const removeFromSkippedData = async (trackId: string): Promise<boolean> => {
    try {
      const success = await window.spotify.removeFromSkippedData(trackId);
      return success;
    } catch (error) {
      console.error("Error removing track from skipped data:", error);
      window.spotify.saveLog(
        `Error removing track ${trackId} from skipped data: ${error}`,
        "ERROR",
      );
      return false;
    }
  };

  /**
   * Handles removal of track from both library and tracking database
   *
   * @param track - Track to remove from library and tracking
   */
  const handleUnlikeTrack = async (track: SkippedTrack) => {
    try {
      const unlikeSuccess = await window.spotify.unlikeTrack(track.id);

      if (unlikeSuccess) {
        window.spotify.saveLog(
          `Manually removed track ${track.id} "${track.name}" from library`,
          "INFO",
        );

        const removeSuccess = await removeFromSkippedData(track.id);

        if (removeSuccess) {
          window.spotify.saveLog(
            `Removed track ${track.id} from skipped data`,
            "INFO",
          );

          toast.success("Track removed", {
            description: `"${track.name}" by ${track.artist} has been removed from your library and skipped tracks.`,
          });

          setSkippedTracks((prev) => prev.filter((t) => t.id !== track.id));
        } else {
          toast.success("Track partially removed", {
            description: `"${track.name}" was removed from your library but couldn't be removed from skipped tracks data.`,
          });

          await loadSkippedData();
        }
      } else {
        toast.error("Failed to remove track", {
          description:
            "Could not remove the track from your library. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error unliking track:", error);
      toast.error("Error", {
        description: "An error occurred while removing the track.",
      });
      window.spotify.saveLog(
        `Error removing track ${track.id}: ${error}`,
        "ERROR",
      );
    }
  };

  /**
   * Removes track from skip tracking without affecting library
   *
   * @param track - Track to remove from skip tracking
   */
  const handleRemoveTrackData = async (track: SkippedTrack) => {
    try {
      const removeSuccess = await removeFromSkippedData(track.id);

      if (removeSuccess) {
        window.spotify.saveLog(
          `Removed track ${track.id} "${track.name}" from skipped data only`,
          "INFO",
        );

        toast.success("Track data removed", {
          description: `"${track.name}" has been removed from skipped tracks data but remains in your library.`,
        });

        setSkippedTracks((prev) => prev.filter((t) => t.id !== track.id));
      } else {
        toast.error("Failed to remove track data", {
          description:
            "Could not remove the track from skipped data. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error removing track data:", error);
      toast.error("Error", {
        description: "An error occurred while removing the track data.",
      });
      window.spotify.saveLog(
        `Error removing track ${track.id} data: ${error}`,
        "ERROR",
      );
    }
  };

  /**
   * Batch removes all tracks exceeding skip threshold
   * from both Spotify library and tracking database
   */
  const handleRemoveAllHighlighted = async () => {
    const tracksToRemove = skippedTracks.filter(shouldSuggestRemoval);

    if (tracksToRemove.length === 0) {
      toast.info("No tracks to remove", {
        description: "There are no tracks that exceed the skip threshold.",
      });
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to remove ${tracksToRemove.length} tracks from your library?`,
      )
    ) {
      return;
    }

    setLoading(true);

    try {
      let successCount = 0;
      let failCount = 0;

      for (const track of tracksToRemove) {
        try {
          const unlikeSuccess = await window.spotify.unlikeTrack(track.id);

          if (unlikeSuccess) {
            const removeSuccess = await removeFromSkippedData(track.id);

            if (removeSuccess) {
              successCount++;
              window.spotify.saveLog(
                `Batch removed track ${track.id} "${track.name}" from library and skipped data`,
                "INFO",
              );
            } else {
              window.spotify.saveLog(
                `Batch removed track ${track.id} "${track.name}" from library only`,
                "INFO",
              );
              failCount++;
            }
          } else {
            failCount++;
            window.spotify.saveLog(
              `Failed to remove track ${track.id} from library during batch operation`,
              "WARNING",
            );
          }
        } catch (error) {
          failCount++;
          console.error(`Error processing track ${track.id}:`, error);
          window.spotify.saveLog(
            `Error removing track ${track.id} during batch operation: ${error}`,
            "ERROR",
          );
        }
      }

      if (successCount > 0) {
        toast.success(`Removed ${successCount} tracks`, {
          description:
            failCount > 0
              ? `Successfully removed ${successCount} tracks, but failed to remove ${failCount} tracks.`
              : `Successfully removed ${successCount} tracks from your library.`,
        });
      } else if (failCount > 0) {
        toast.error("Operation failed", {
          description: `Failed to remove any of the ${failCount} tracks.`,
        });
      }

      await loadSkippedData();
    } catch (error) {
      console.error("Error in batch remove operation:", error);
      toast.error("Operation failed", {
        description:
          "An error occurred while removing tracks. See logs for details.",
      });
      window.spotify.saveLog(
        `Error in batch remove operation: ${error}`,
        "ERROR",
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Purges all skip tracking data while preserving Spotify library
   */
  const handleClearSkippedData = async () => {
    if (
      !window.confirm(
        "Are you sure you want to clear all skipped tracks data? This action cannot be undone.",
      )
    ) {
      return;
    }

    setLoading(true);

    try {
      const success = await window.spotify.saveSkippedTracks([]);

      if (success) {
        setSkippedTracks([]);

        toast.success("Data cleared", {
          description: "All skipped tracks data has been cleared.",
        });

        window.spotify.saveLog("Cleared all skipped tracks data", "INFO");
      } else {
        toast.error("Failed to clear data", {
          description:
            "An error occurred while clearing the skipped tracks data.",
        });
      }
    } catch (error) {
      console.error("Error clearing skipped data:", error);
      toast.error("Error", {
        description: "An error occurred while clearing the data.",
      });
      window.spotify.saveLog(`Error clearing skipped data: ${error}`, "ERROR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-4">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row">
        <div className="flex-1 pr-4">
          <h1 className="text-2xl font-bold">Skipped Tracks</h1>
          <p className="text-muted-foreground text-sm text-wrap">
            Tracks you&apos;ve skipped within the last {timeframeInDays} days.
            <span className="mt-0.5 block text-xs">
              Tracks skipped {skipThreshold}+ times are highlighted for removal.
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenSkipsDirectory}
            title="Open skip data folder"
            className="flex items-center gap-1"
          >
            <FolderOpen className="h-4 w-4" />
            <span>Open Skips</span>
          </Button>
          <Button onClick={loadSkippedData} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Bulk Action Buttons */}
      <div className="mb-4 flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearSkippedData}
          disabled={loading || skippedTracks.length === 0}
          className="border-yellow-300 text-yellow-600 hover:text-yellow-800"
          title="Remove all tracking data but keep tracks in library"
        >
          Clear All Skipped Data
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRemoveAllHighlighted}
          disabled={loading || !skippedTracks.some(shouldSuggestRemoval)}
          className="border-red-300 text-red-600 hover:text-red-800"
          title="Remove all highlighted tracks from library"
        >
          Remove All Highlighted
        </Button>
      </div>

      <Card>
        <CardContent className="p-2 sm:p-6">
          <ScrollArea
            className="h-[calc(80vh-20rem)] w-full overflow-x-auto overflow-y-hidden pr-2"
            type="always"
          >
            <Table className="w-full border-collapse">
              <TableHeader className="bg-background sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[40%]">Track</TableHead>
                  <TableHead className="w-[8%] text-right">Recent</TableHead>
                  <TableHead className="w-[8%] text-right">Total</TableHead>
                  <TableHead className="w-[10%] text-right">
                    Completed
                  </TableHead>
                  <TableHead className="w-[8%] text-right">Ratio</TableHead>
                  <TableHead className="w-[20%] text-right">
                    Last Skipped
                  </TableHead>
                  <TableHead className="w-[6%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skippedTracks.length > 0 ? (
                  [...skippedTracks].sort(sortBySkipCount).map((track) => {
                    const recentSkips = getRecentSkipCount(track);
                    const suggestRemoval = shouldSuggestRemoval(track);

                    return (
                      <TableRow
                        key={track.id}
                        className={
                          suggestRemoval ? "bg-red-50 dark:bg-red-950/20" : ""
                        }
                      >
                        <TableCell className="w-full max-w-0 overflow-hidden">
                          <div className="w-full">
                            <div
                              className={`w-full truncate font-medium ${
                                suggestRemoval
                                  ? "text-red-600 dark:text-red-400"
                                  : ""
                              }`}
                              title={track.name}
                            >
                              {track.name}
                              {suggestRemoval && " 🗑️"}
                            </div>
                            <div
                              className="text-muted-foreground w-full truncate text-sm"
                              title={track.artist}
                            >
                              {track.artist}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              suggestRemoval
                                ? "font-bold text-red-600 dark:text-red-400"
                                : ""
                            }
                          >
                            {recentSkips}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {track.skipCount}
                        </TableCell>
                        <TableCell className="text-right">
                          {track.notSkippedCount}
                        </TableCell>
                        <TableCell className="text-right">
                          {calculateSkipRatio(track)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatDate(track.lastSkipped)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                >
                                  <span className="sr-only">Open menu</span>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleUnlikeTrack(track)}
                                  className="cursor-pointer text-red-600 hover:text-red-800 dark:text-red-400 hover:dark:text-red-300"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>Remove from library</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleRemoveTrackData(track)}
                                  className="cursor-pointer text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 hover:dark:text-yellow-300"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  <span>Remove tracking data</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-6 text-center">
                      {loading ? (
                        <p>Loading skipped tracks data...</p>
                      ) : (
                        <p>No skipped tracks data available.</p>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
