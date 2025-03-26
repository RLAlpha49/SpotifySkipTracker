import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { shouldSuggestRemoval, sortBySkipCount } from "./utils";
import { SkippedTrackRow } from "./SkippedTrackRow";
import { SkipForward, BarChart, Music } from "lucide-react";

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
