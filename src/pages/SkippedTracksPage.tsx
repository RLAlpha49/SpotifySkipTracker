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
import { toast } from "sonner";
import { SpotifySettings } from "@/types/spotify";
import { SkippedTrack } from "@/components/skippedTracks/types";
import { shouldSuggestRemoval } from "@/components/skippedTracks/utils";
import { SkippedTracksHeader } from "@/components/skippedTracks/SkippedTracksHeader";
import { SkippedTracksBulkActions } from "@/components/skippedTracks/SkippedTracksBulkActions";
import { SkippedTracksTable } from "@/components/skippedTracks/SkippedTracksTable";

export default function SkippedTracksPage() {
  const [skippedTracks, setSkippedTracks] = useState<SkippedTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeframeInDays, setTimeframeInDays] = useState(30);
  const [skipThreshold, setSkipThreshold] = useState(3);
  const [autoUnlike, setAutoUnlike] = useState(true);

  // Confirmation dialog states
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
  const [showRemoveHighlightedDialog, setShowRemoveHighlightedDialog] =
    useState(false);

  /**
   * Fetches skipped tracks and initializes component state with user settings
   */
  const loadSkippedData = async () => {
    setLoading(true);
    try {
      const tracks = await window.spotify.getSkippedTracks();

      const settings = await window.spotify.getSettings() as SpotifySettings;
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
   * Processes tracks for automatic removal based on skip threshold
   * Only runs when autoUnlike setting is enabled
   */
  const checkForAutoUnlike = async () => {
    if (!autoUnlike) return;

    try {
      const tracksToUnlike = skippedTracks.filter(track => 
        shouldSuggestRemoval(track, skipThreshold, timeframeInDays)
      );
      
      if (tracksToUnlike.length === 0) return;

      const removedTrackIds: string[] = [];

      for (const track of tracksToUnlike) {
        try {
          if (track.autoProcessed) continue;

          const unlikeSuccess = await window.spotify.unlikeTrack(track.id);

          if (unlikeSuccess) {
            window.spotify.saveLog(
              `Auto-removed track ${track.id} "${track.name}" from library (${shouldSuggestRemoval(track, skipThreshold, timeframeInDays) ? "eligible for removal" : "not eligible for removal"})`,
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
    const tracksToRemove = skippedTracks.filter(track => 
      shouldSuggestRemoval(track, skipThreshold, timeframeInDays)
    );

    if (tracksToRemove.length === 0) {
      toast.info("No tracks to remove", {
        description: "There are no tracks that exceed the skip threshold.",
      });
      return;
    }

    // Close the dialog since we're proceeding with the action
    setShowRemoveHighlightedDialog(false);
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
    // Close the dialog since we're proceeding with the action
    setShowClearDataDialog(false);
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
      <SkippedTracksHeader
        timeframeInDays={timeframeInDays}
        skipThreshold={skipThreshold}
        loading={loading}
        onRefresh={loadSkippedData}
        onOpenSkipsDirectory={handleOpenSkipsDirectory}
      />

      <SkippedTracksBulkActions
        loading={loading}
        tracks={skippedTracks}
        skipThreshold={skipThreshold}
        timeframeInDays={timeframeInDays}
        showClearDataDialog={showClearDataDialog}
        setShowClearDataDialog={setShowClearDataDialog}
        showRemoveHighlightedDialog={showRemoveHighlightedDialog}
        setShowRemoveHighlightedDialog={setShowRemoveHighlightedDialog}
        onClearSkippedData={handleClearSkippedData}
        onRemoveAllHighlighted={handleRemoveAllHighlighted}
      />

      <SkippedTracksTable
        tracks={skippedTracks}
        loading={loading}
        skipThreshold={skipThreshold}
        timeframeInDays={timeframeInDays}
        onUnlikeTrack={handleUnlikeTrack}
        onRemoveTrackData={handleRemoveTrackData}
      />
    </div>
  );
}
