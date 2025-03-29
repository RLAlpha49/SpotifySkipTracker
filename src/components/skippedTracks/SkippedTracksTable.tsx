/**
 * @packageDocumentation
 * @module SkippedTracksTable
 * @description Skipped Tracks Analysis Table Component
 *
 * Provides a comprehensive tabular visualization of the user's skipped tracks data
 * with sorting, contextual styling, and empty/loading states. This component forms
 * the central data visualization for the skipped tracks analysis feature.
 *
 * Features:
 * - Sorted display of tracks by skip frequency
 * - Responsive table layout with appropriate column sizing
 * - Fixed header with column names during scrolling
 * - Empty state visualization with contextual messaging
 * - Loading state visualization during data retrieval
 * - Scrollable container with fixed summary footer
 * - Skip statistics summary for the entire dataset
 *
 * This component serves as the primary data presentation layer for the skip tracking
 * functionality, providing users with an organized view of their skip patterns.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SkippedTrack } from "@/types/spotify";
import { BarChart, Music, SkipForward } from "lucide-react";
import React from "react";
import { SkippedTrackRow } from "./SkippedTrackRow";
import { shouldSuggestRemoval, sortBySkipCount } from "./utils";

/**
 * Props for the SkippedTracksTable component
 *
 * @property tracks - Array of skipped track data objects to display
 * @property loading - Whether data is currently being loaded
 * @property skipThreshold - Minimum number of skips to highlight tracks for removal
 * @property timeframeInDays - Number of days to consider for skip analysis
 * @property onUnlikeTrack - Callback for removing a track from Spotify library
 * @property onRemoveTrackData - Callback for removing just a track's skip data
 */
interface SkippedTracksTableProps {
  tracks: SkippedTrack[];
  loading: boolean;
  skipThreshold: number;
  timeframeInDays: number;
  onUnlikeTrack: (track: SkippedTrack) => Promise<void>;
  onRemoveTrackData: (track: SkippedTrack) => Promise<void>;
}

/**
 * Skipped tracks data visualization table
 *
 * Renders a comprehensive table of skipped tracks with all relevant statistics
 * and metadata, sorted by skip frequency. Provides appropriate visual states for
 * loading and empty data scenarios.
 *
 * The component includes:
 * - Fixed header with descriptive column names
 * - Dynamic row generation for each track with consistent styling
 * - Scrollable container with appropriate height constraints
 * - Empty state with contextual messaging and visual indicators
 * - Loading state with animated indicators during data retrieval
 * - Summary footer with aggregate statistics when data is present
 *
 * @param props - Component properties
 * @param props.tracks - Array of skipped track data to display
 * @param props.loading - Whether data is being retrieved
 * @param props.skipThreshold - Skip threshold for highlighting rows
 * @param props.timeframeInDays - Analysis window in days
 * @param props.onUnlikeTrack - Function to handle track removal from library
 * @param props.onRemoveTrackData - Function to handle skip data deletion
 * @returns React component for skipped tracks table
 * @source
 */
export function SkippedTracksTable({
  tracks,
  loading,
  skipThreshold,
  timeframeInDays,
  onUnlikeTrack,
  onRemoveTrackData,
}: SkippedTracksTableProps) {
  const sortedTracks = [...tracks].sort((a, b) =>
    sortBySkipCount(a, b, timeframeInDays),
  );

  return (
    <Card className="pb-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart className="text-primary h-4 w-4" />
            <CardTitle className="text-base">Track Skip Analytics</CardTitle>
          </div>
          <div className="text-muted-foreground text-xs">
            Sorted by recent skip frequency
          </div>
        </div>
        <CardDescription>
          Track your skip patterns to identify songs that might not fit your
          preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative">
          <ScrollArea
            className="border-border/50 h-[calc(80vh-20rem)] overflow-x-hidden overflow-y-hidden rounded-t-md border"
            type="always"
          >
            <div className="mr-2 px-1 pb-1">
              <Table className="w-full border-collapse">
                <TableHeader className="bg-card/95 sticky top-0 z-10 backdrop-blur-sm">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[40%] py-3">Track</TableHead>
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
                  {sortedTracks.length > 0 ? (
                    sortedTracks.map((track) => (
                      <SkippedTrackRow
                        key={track.id}
                        track={track}
                        timeframeInDays={timeframeInDays}
                        shouldSuggestRemoval={shouldSuggestRemoval(
                          track,
                          skipThreshold,
                          timeframeInDays,
                        )}
                        onUnlikeTrack={onUnlikeTrack}
                        onRemoveTrackData={onRemoveTrackData}
                      />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-60">
                        <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                          {loading ? (
                            <>
                              <div className="bg-muted mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                                <SkipForward className="text-muted-foreground h-6 w-6 animate-pulse" />
                              </div>
                              <p className="text-muted-foreground">
                                Loading skipped tracks data...
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="bg-muted mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                                <Music className="text-muted-foreground h-6 w-6" />
                              </div>
                              <p className="font-medium">
                                No skipped tracks data available
                              </p>
                              <p className="text-muted-foreground text-sm">
                                Track data will appear here when you skip songs
                                in Spotify
                              </p>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>

          {/* Summary footer */}
          {sortedTracks.length > 0 && (
            <div className="bg-muted/30 text-muted-foreground flex items-center justify-between rounded-b-md border-t p-2 text-xs">
              <div>
                <span className="font-medium">{sortedTracks.length}</span>{" "}
                tracks tracked
              </div>
              <div className="flex items-center gap-1">
                <SkipForward className="h-3.5 w-3.5" />
                <span>
                  {sortedTracks.reduce(
                    (sum, track) => sum + (track.skipCount || 0),
                    0,
                  )}{" "}
                  total skips recorded
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
