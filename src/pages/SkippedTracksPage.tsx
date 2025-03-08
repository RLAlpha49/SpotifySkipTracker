/**
 * Skipped Tracks Page
 *
 * This page displays statistics about tracks the user has skipped while listening to Spotify.
 * It shows a table with:
 * - Track name and artist
 * - Number of times the track has been skipped
 * - Number of times the track has been played to completion
 * - Skip ratio (skips / total plays)
 * - Date of the most recent skip
 *
 * The data is sorted by skip count (highest first) to highlight tracks
 * that the user skips most frequently.
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
 * Information about a track that has been skipped
 */
type SkippedTrack = {
  id: string;
  name: string;
  artist: string;
  skipCount: number;
  notSkippedCount: number;
  lastSkipped: string;
  skipTimestamps?: string[]; // Array of timestamps when track was skipped
  autoProcessed?: boolean; // Flag to track if a track has been auto-processed
};

export default function SkippedTracksPage() {
  // State for tracked skipped tracks data
  const [skippedTracks, setSkippedTracks] = useState<SkippedTrack[]>([]);
  // Loading state for data fetching
  const [loading, setLoading] = useState(false);
  // Settings for timeframe filtering
  const [timeframeInDays, setTimeframeInDays] = useState(30);
  // Skip threshold from settings
  const [skipThreshold, setSkipThreshold] = useState(3);
  // Auto-unlike setting
  const [autoUnlike, setAutoUnlike] = useState(true);

  /**
   * Load skipped tracks data and settings
   */
  const loadSkippedData = async () => {
    setLoading(true);
    try {
      // Get skip data
      const tracks = await window.spotify.getSkippedTracks();

      // Get settings to know the timeframe and threshold
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

      // Log error
      window.spotify.saveLog(`Error loading skipped tracks: ${error}`, "ERROR");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get the number of skips within the configured timeframe
   *
   * @param track - Skipped track information
   * @returns Number of skips within the timeframe
   */
  const getRecentSkipCount = (track: SkippedTrack): number => {
    // If no timestamps available, use the total count
    if (!track.skipTimestamps || track.skipTimestamps.length === 0) {
      return track.skipCount;
    }

    // Calculate the cutoff date based on timeframe setting
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframeInDays);

    // Count skips that occurred after the cutoff date
    return track.skipTimestamps.filter((timestamp) => {
      const skipDate = new Date(timestamp);
      return skipDate >= cutoffDate;
    }).length;
  };

  /**
   * Check if a track has been skipped enough times within the timeframe to be suggested for removal
   *
   * @param track - SkippedTrack to check
   * @returns True if track should be suggested for removal
   */
  const shouldSuggestRemoval = (track: SkippedTrack): boolean => {
    try {
      // Get recent skip count
      const recentSkips = getRecentSkipCount(track);

      // Use the skipThreshold state variable that we loaded from settings
      return recentSkips >= skipThreshold;
    } catch (error) {
      console.error("Error calculating skip suggestion:", error);
      return false;
    }
  };

  /**
   * Check for tracks that exceed the skip threshold and auto-unlike them if the setting is enabled
   */
  const checkForAutoUnlike = async () => {
    if (!autoUnlike) return; // Skip if auto-unlike is disabled

    try {
      // Find tracks that exceed the threshold
      const tracksToUnlike = skippedTracks.filter(shouldSuggestRemoval);

      if (tracksToUnlike.length === 0) return;

      // Track successful removals to update state at once
      const removedTrackIds: string[] = [];

      // Auto-unlike each track
      for (const track of tracksToUnlike) {
        try {
          // Check if track was already processed (to avoid duplicates)
          if (track.autoProcessed) continue;

          // Call the API to unlike the track
          const unlikeSuccess = await (
            window.spotify as unknown as {
              unlikeTrack: (trackId: string) => Promise<boolean>;
            }
          ).unlikeTrack(track.id);

          if (unlikeSuccess) {
            // Log the library removal
            window.spotify.saveLog(
              `Auto-removed track ${track.id} "${track.name}" from library (${getRecentSkipCount(track)} skips)`,
              "INFO",
            );

            // Now remove from skipped data
            const removeSuccess = await removeFromSkippedData(track.id);

            if (removeSuccess) {
              // Add to the list of successfully removed track IDs
              removedTrackIds.push(track.id);
              window.spotify.saveLog(
                `Removed track ${track.id} from skipped data`,
                "INFO",
              );
            }

            // Mark as processed to avoid duplicate processing
            track.autoProcessed = true;

            // Show success message (only for the first few to avoid flooding)
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

      // Update local state to remove successfully removed tracks
      if (removedTrackIds.length > 0) {
        setSkippedTracks((prev) =>
          prev.filter((track) => !removedTrackIds.includes(track.id)),
        );
      } else {
        // Refresh data if no direct state updates were made
        await loadSkippedData();
      }
    } catch (error) {
      console.error("Error in auto-unlike process:", error);
    }
  };

  // Existing open directory handler
  const handleOpenSkipsDirectory = async () => {
    try {
      await (
        window.spotify as unknown as { openSkipsDirectory: () => Promise<void> }
      ).openSkipsDirectory();
    } catch (error) {
      console.error("Failed to open skip data folder:", error);
      toast.error("Failed to open skip data folder", {
        description: "Could not open the folder where skip data is saved.",
      });
    }
  };

  // Load data when component mounts
  useEffect(() => {
    loadSkippedData();
  }, []);

  // Effect to run auto-unlike check whenever skipped tracks or settings change
  useEffect(() => {
    if (skippedTracks.length > 0) {
      checkForAutoUnlike();
    }
  }, [skippedTracks, autoUnlike, skipThreshold]);

  /**
   * Calculate the skip ratio (skips / total plays)
   *
   * @param track - Skipped track information
   * @returns Formatted skip ratio as a percentage
   */
  const calculateSkipRatio = (track: SkippedTrack): string => {
    const totalPlays = track.skipCount + track.notSkippedCount;
    if (totalPlays === 0) return "0%";

    const ratio = (track.skipCount / totalPlays) * 100;
    return `${ratio.toFixed(0)}%`;
  };

  /**
   * Format date string to a user-friendly format
   *
   * @param dateString - ISO date string
   * @returns Formatted date string or "Never" if empty
   */
  const formatDate = (dateString: string): string => {
    if (!dateString) return "Never";

    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  /**
   * Sort tracks by skip count (highest first)
   *
   * @param a - First track
   * @param b - Second track
   * @returns Sort comparison result
   */
  const sortBySkipCount = (a: SkippedTrack, b: SkippedTrack): number => {
    // First sort by recent skips
    const recentSkipsA = getRecentSkipCount(a);
    const recentSkipsB = getRecentSkipCount(b);

    if (recentSkipsB !== recentSkipsA) {
      return recentSkipsB - recentSkipsA;
    }

    // If recent skips are equal, sort by total skips
    return b.skipCount - a.skipCount;
  };

  /**
   * Remove a track from the skipped tracks data
   *
   * @param trackId - The ID of the track to remove
   * @returns Whether the operation was successful
   */
  const removeFromSkippedData = async (trackId: string): Promise<boolean> => {
    try {
      // Call the API to remove the track from skipped data
      const success = await (
        window.spotify as unknown as {
          removeFromSkippedData: (trackId: string) => Promise<boolean>;
        }
      ).removeFromSkippedData(trackId);

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
   * Handle unliking (removing) a track from the library
   *
   * @param track - The track to unlike
   */
  const handleUnlikeTrack = async (track: SkippedTrack) => {
    try {
      // Call the API to unlike the track from Spotify
      const unlikeSuccess = await (
        window.spotify as unknown as {
          unlikeTrack: (trackId: string) => Promise<boolean>;
        }
      ).unlikeTrack(track.id);

      if (unlikeSuccess) {
        // Log the library removal
        window.spotify.saveLog(
          `Manually removed track ${track.id} "${track.name}" from library`,
          "INFO",
        );

        // Now remove from skipped data
        const removeSuccess = await removeFromSkippedData(track.id);

        if (removeSuccess) {
          window.spotify.saveLog(
            `Removed track ${track.id} from skipped data`,
            "INFO",
          );

          // Show success message
          toast.success("Track removed", {
            description: `"${track.name}" by ${track.artist} has been removed from your library and skipped tracks.`,
          });

          // Remove from local state to update UI immediately
          setSkippedTracks((prev) => prev.filter((t) => t.id !== track.id));
        } else {
          // If removing from skipped data failed, still show partial success
          toast.success("Track partially removed", {
            description: `"${track.name}" was removed from your library but couldn't be removed from skipped tracks data.`,
          });

          // Refresh the data to ensure UI is updated
          await loadSkippedData();
        }
      } else {
        // Show error message
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
   * Remove a track from the skipped tracks data without removing from library
   *
   * @param track - The track to remove from tracking data
   */
  const handleRemoveTrackData = async (track: SkippedTrack) => {
    try {
      // Call the API to remove the track from skipped data only
      const removeSuccess = await removeFromSkippedData(track.id);

      if (removeSuccess) {
        window.spotify.saveLog(
          `Removed track ${track.id} "${track.name}" from skipped data only`,
          "INFO",
        );

        // Show success message
        toast.success("Track data removed", {
          description: `"${track.name}" has been removed from skipped tracks data but remains in your library.`,
        });

        // Remove from local state to update UI immediately
        setSkippedTracks((prev) => prev.filter((t) => t.id !== track.id));
      } else {
        // Show error message
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
   * Remove all highlighted tracks (those that exceed the skip threshold)
   * from the user's Spotify library
   */
  const handleRemoveAllHighlighted = async () => {
    // Find tracks that exceed the skip threshold
    const tracksToRemove = skippedTracks.filter(shouldSuggestRemoval);

    if (tracksToRemove.length === 0) {
      toast.info("No tracks to remove", {
        description: "There are no tracks that exceed the skip threshold.",
      });
      return;
    }

    // Ask for confirmation before proceeding
    if (
      !window.confirm(
        `Are you sure you want to remove ${tracksToRemove.length} tracks from your library?`,
      )
    ) {
      return;
    }

    // Set loading state
    setLoading(true);

    try {
      let successCount = 0;
      let failCount = 0;

      // Process tracks one by one
      for (const track of tracksToRemove) {
        try {
          // Remove from Spotify library
          const unlikeSuccess = await window.spotify.unlikeTrack(track.id);

          if (unlikeSuccess) {
            // Remove from skipped data
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

      // Show result message
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

      // Refresh data
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
   * Clear all skipped tracks data
   */
  const handleClearSkippedData = async () => {
    // Ask for confirmation before clearing data
    if (
      !window.confirm(
        "Are you sure you want to clear all skipped tracks data? This action cannot be undone.",
      )
    ) {
      return;
    }

    setLoading(true);

    try {
      // Save an empty array to clear the data
      const success = await window.spotify.saveSkippedTracks([]);

      if (success) {
        // Update local state
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

      <div className="mb-4 flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearSkippedData}
          disabled={loading || skippedTracks.length === 0}
          className="border-yellow-300 text-yellow-600 hover:text-yellow-800"
        >
          Clear All Skipped Data
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRemoveAllHighlighted}
          disabled={loading || !skippedTracks.some(shouldSuggestRemoval)}
          className="border-red-300 text-red-600 hover:text-red-800"
        >
          Remove All Highlighted
        </Button>
      </div>

      <Card>
        <CardContent className="p-2 sm:p-6">
          <ScrollArea className="h-[70vh] w-full pr-2" type="always">
            <div className="w-full overflow-x-auto">
              <div>
                <Table className="w-full border-collapse">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Track</TableHead>
                      <TableHead className="w-[8%] text-right">
                        Recent
                      </TableHead>
                      <TableHead className="w-[8%] text-right">Total</TableHead>
                      <TableHead className="w-[10%] text-right">
                        Completed
                      </TableHead>
                      <TableHead className="w-[8%] text-right">Ratio</TableHead>
                      <TableHead className="w-[20%] text-right">
                        Last Skipped
                      </TableHead>
                      <TableHead className="w-[6%] text-right">
                        Actions
                      </TableHead>
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
                              suggestRemoval
                                ? "bg-red-50 dark:bg-red-950/20"
                                : ""
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
                                      onClick={() =>
                                        handleRemoveTrackData(track)
                                      }
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
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
