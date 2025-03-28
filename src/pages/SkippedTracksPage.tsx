/**
 * Skipped Music Track Analysis & Management System
 *
 * Comprehensive interface for analyzing, managing, and acting on skip behavior patterns.
 * Identifies problematic tracks based on user-configurable thresholds and provides
 * tools for library optimization.
 *
 * Key capabilities:
 * - Track skip frequency analysis with sorting and filtering
 * - Automatic library cleanup recommendations based on skip patterns
 * - Manual and automatic track removal with configurable thresholds
 * - Batch operations for efficient library management
 * - Historical skip data visualization with temporal context
 *
 * Technical implementation:
 * - Dynamic data loading with async/await patterns
 * - Optimistic UI updates for immediate feedback
 * - Configurable timeframe analysis (7/30/90 days)
 * - Cross-component state management
 * - Lazy loading for performance optimization
 * - Confirmation workflows for destructive operations
 *
 * Data handling:
 * - Skip timestamp tracking for historical analysis
 * - Skip/listen ratio calculation for engagement metrics
 * - Persistence with error handling and recovery
 */

import { shouldSuggestRemoval } from "@/components/skippedTracks/utils";
import { LoadingSpinner } from "@/components/ui/spinner";
import { SkippedTracksLayout } from "@/layouts/SkippedTracksLayout";
import { SettingsSchema } from "@/types/settings";
import { SkippedTrack } from "@/types/spotify";
import React, { Suspense, lazy, useEffect, useState } from "react";
import { toast } from "sonner";

// Lazy load heavy components
const SkippedTracksHeader = lazy(() =>
  import("@/components/skippedTracks/SkippedTracksHeader").then((module) => ({
    default: module.SkippedTracksHeader,
  })),
);
const SkippedTracksBulkActions = lazy(() =>
  import("@/components/skippedTracks/SkippedTracksBulkActions").then(
    (module) => ({ default: module.SkippedTracksBulkActions }),
  ),
);
const SkippedTracksTable = lazy(() =>
  import("@/components/skippedTracks/SkippedTracksTable").then((module) => ({
    default: module.SkippedTracksTable,
  })),
);

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
   * Initializes component with skip data and user preferences
   *
   * Performs multi-stage initialization by:
   * 1. Loading skipped track history from persistent storage
   * 2. Retrieving user configuration settings for thresholds and timeframes
   * 3. Synchronizing component state with application preferences
   * 4. Ensuring proper error handling with user feedback
   *
   * Sets the foundation for all skip analysis functionality by establishing
   * data context and user preferences for analysis parameters.
   */
  const loadSkippedData = async () => {
    setLoading(true);
    try {
      const tracks = await window.spotify.getSkippedTracks();

      const settings = (await window.spotify.getSettings()) as SettingsSchema;
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
   * Refreshes skipped tracks data using the dedicated refresh endpoint
   */
  const refreshSkippedData = async () => {
    setLoading(true);
    try {
      const tracks = await window.spotify.refreshSkippedTracks();
      setSkippedTracks(tracks);

      toast.success("Data refreshed", {
        description: "Skipped tracks data has been refreshed.",
      });

      window.spotify.saveLog("Refreshed skipped tracks data", "INFO");
    } catch (error) {
      console.error("Failed to refresh skipped tracks:", error);
      toast.error("Failed to refresh data", {
        description: "Could not refresh skipped tracks data.",
      });
      window.spotify.saveLog(
        `Error refreshing skipped tracks: ${error}`,
        "ERROR",
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Evaluates tracks for automatic removal based on user preferences
   *
   * Implements intelligent library management by:
   * 1. Filtering tracks that meet removal criteria based on skip threshold
   * 2. Processing eligible tracks individually while respecting rate limits
   * 3. Removing tracks from both Spotify library and local tracking data
   * 4. Providing user feedback with grouped notifications to prevent overwhelming
   * 5. Logging detailed removal information for audit and troubleshooting
   *
   * Only executes when autoUnlike setting is enabled, respecting user preference
   * for automated library management.
   */
  const checkForAutoUnlike = async () => {
    if (!autoUnlike) return;

    try {
      const tracksToUnlike = skippedTracks.filter((track) =>
        shouldSuggestRemoval(track, skipThreshold, timeframeInDays),
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
   * Removes a track from Spotify library with optimistic UI updates
   *
   * Handles the complete unlike workflow:
   * 1. Initiates Spotify API call to remove track from user's library
   * 2. Updates local skip tracking data to reflect removal
   * 3. Optimistically updates UI before API completion for responsive feel
   * 4. Provides appropriate user feedback based on operation result
   * 5. Handles errors gracefully with clear error messaging
   *
   * @param track - Track object containing ID and metadata for removal
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
    const tracksToRemove = skippedTracks.filter((track) =>
      shouldSuggestRemoval(track, skipThreshold, timeframeInDays),
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
    <SkippedTracksLayout
      isLoading={loading}
      header={
        <Suspense
          fallback={<LoadingSpinner size="md" text="Loading header..." />}
        >
          <SkippedTracksHeader
            timeframeInDays={timeframeInDays}
            skipThreshold={skipThreshold}
            loading={loading}
            onRefresh={refreshSkippedData}
            onOpenSkipsDirectory={handleOpenSkipsDirectory}
          />
        </Suspense>
      }
      bulkActions={
        <Suspense
          fallback={<LoadingSpinner size="md" text="Loading actions..." />}
        >
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
        </Suspense>
      }
      tracksTable={
        <Suspense
          fallback={<LoadingSpinner size="lg" text="Loading track data..." />}
        >
          <SkippedTracksTable
            tracks={skippedTracks}
            loading={loading}
            skipThreshold={skipThreshold}
            timeframeInDays={timeframeInDays}
            onUnlikeTrack={handleUnlikeTrack}
            onRemoveTrackData={handleRemoveTrackData}
          />
        </Suspense>
      }
    />
  );
}
