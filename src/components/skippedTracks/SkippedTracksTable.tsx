import React from "react";
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
import { SkippedTrack } from "@/types/spotify";
import { shouldSuggestRemoval, sortBySkipCount } from "./utils";
import { SkippedTrackRow } from "./SkippedTrackRow";

interface SkippedTracksTableProps {
  tracks: SkippedTrack[];
  loading: boolean;
  skipThreshold: number;
  timeframeInDays: number;
  onUnlikeTrack: (track: SkippedTrack) => Promise<void>;
  onRemoveTrackData: (track: SkippedTrack) => Promise<void>;
}

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
                <TableHead className="w-[10%] text-right">Completed</TableHead>
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
  );
}
