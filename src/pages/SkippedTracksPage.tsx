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
      
      // The main process already logs this, so we don't need to log it again here
      // window.spotify.saveLog("Loaded skipped tracks from storage", "DEBUG");
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
        <Button onClick={loadSkippedData} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-2 sm:p-6">
          <ScrollArea className="h-[70vh] w-full pr-2" type="always">
            <div className="w-full overflow-x-hidden">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-full">Track</TableHead>
                    <TableHead className="text-right w-[100px] whitespace-nowrap">Skips</TableHead>
                    <TableHead className="text-right w-[100px] whitespace-nowrap">Completed</TableHead>
                    <TableHead className="text-right w-[100px] whitespace-nowrap">Skip Ratio</TableHead>
                    <TableHead className="text-right w-[140px] whitespace-nowrap">Last Skipped</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skippedTracks.length > 0 ? (
                    [...skippedTracks].sort(sortBySkipCount).map((track) => (
                      <TableRow key={track.id}>
                        <TableCell className="max-w-[200px] md:max-w-none w-full">
                          <div className="overflow-hidden">
                            <div className="font-medium overflow-hidden text-ellipsis" title={track.name}>{track.name}</div>
                            <div className="text-muted-foreground text-sm overflow-hidden text-ellipsis" title={track.artist}>
                              {track.artist}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right w-[100px] whitespace-nowrap">
                          {track.skipCount}
                        </TableCell>
                        <TableCell className="text-right w-[100px] whitespace-nowrap">
                          {track.notSkippedCount}
                        </TableCell>
                        <TableCell className="text-right w-[100px] whitespace-nowrap">
                          {calculateSkipRatio(track)}
                        </TableCell>
                        <TableCell className="text-right w-[140px] whitespace-nowrap">
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
