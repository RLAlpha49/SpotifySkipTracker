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
import { FolderOpen } from "lucide-react";

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
};

export default function SkippedTracksPage() {
  // State for tracked skipped tracks data
  const [skippedTracks, setSkippedTracks] = useState<SkippedTrack[]>([]);
  // Loading state for data fetching
  const [loading, setLoading] = useState(false);

  /**
   * Load skipped tracks data from storage
   */
  const loadSkippedData = async () => {
    setLoading(true);
    try {
      const tracks = await window.spotify.getSkippedTracks();
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

  const handleOpenSkipsDirectory = async () => {
    try {
      await ((window.spotify as unknown) as { openSkipsDirectory: () => Promise<void> }).openSkipsDirectory();
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
    return b.skipCount - a.skipCount;
  };

  return (
    <div className="container mx-auto py-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Skipped Tracks</h1>
          <p className="text-muted-foreground text-sm">
            Tracks you&apos;ve skipped while listening to Spotify
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleOpenSkipsDirectory}
            title="Open skip data folder"
            className="flex items-center gap-1"
          >
            <FolderOpen className="h-4 w-4" />
            <span>Open Skips</span>
          </Button>
          <Button variant="outline" onClick={loadSkippedData} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-2 sm:p-6">
          <ScrollArea className="h-[70vh] w-full pr-2" type="always">
            <div className="w-full overflow-x-hidden">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-full">Track</TableHead>
                    <TableHead className="w-[100px] text-right whitespace-nowrap">
                      Skips
                    </TableHead>
                    <TableHead className="w-[100px] text-right whitespace-nowrap">
                      Completed
                    </TableHead>
                    <TableHead className="w-[100px] text-right whitespace-nowrap">
                      Skip Ratio
                    </TableHead>
                    <TableHead className="w-[140px] text-right whitespace-nowrap">
                      Last Skipped
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skippedTracks.length > 0 ? (
                    [...skippedTracks].sort(sortBySkipCount).map((track) => (
                      <TableRow key={track.id}>
                        <TableCell className="w-full max-w-[100px] md:max-w-none">
                          <div className="overflow-hidden">
                            <div
                              className="overflow-hidden font-medium text-ellipsis"
                              title={track.name}
                            >
                              {track.name}
                            </div>
                            <div
                              className="text-muted-foreground overflow-hidden text-sm text-ellipsis"
                              title={track.artist}
                            >
                              {track.artist}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="w-[100px] text-right whitespace-nowrap">
                          {track.skipCount}
                        </TableCell>
                        <TableCell className="w-[100px] text-right whitespace-nowrap">
                          {track.notSkippedCount}
                        </TableCell>
                        <TableCell className="w-[100px] text-right whitespace-nowrap">
                          {calculateSkipRatio(track)}
                        </TableCell>
                        <TableCell className="w-[140px] text-right whitespace-nowrap">
                          {formatDate(track.lastSkipped)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center">
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
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
