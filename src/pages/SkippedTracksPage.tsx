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

type SkippedTrack = {
  id: string;
  name: string;
  artist: string;
  skipCount: number;
  lastSkipped: string;
};

export default function SkippedTracksPage() {
  const [skippedTracks, setSkippedTracks] = useState<SkippedTrack[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSkippedData = async () => {
    setLoading(true);
    try {
      const tracks = await window.spotify.getSkippedTracks();
      setSkippedTracks(tracks);

      // Log successful load
      window.spotify.saveLog("Loaded skipped tracks from storage", "DEBUG");
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

  useEffect(() => {
    loadSkippedData();
  }, []);

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold">Skipped Tracks</h1>
          <p className="text-muted-foreground text-sm uppercase">
            Tracks you&apos;ve skipped frequently
          </p>
        </div>
        <Button onClick={loadSkippedData} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <Card className="flex flex-1 flex-col">
        <CardContent className="flex flex-1 flex-col p-6">
          <ScrollArea className="h-[calc(100vh-220px)] w-full flex-1">
            {skippedTracks.length > 0 ? (
              <div className="w-full overflow-x-hidden">
                <Table className="w-full table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Track</TableHead>
                      <TableHead className="w-[15%]">Artist</TableHead>
                      <TableHead className="w-[10%] text-right">
                        Skips
                      </TableHead>
                      <TableHead className="w-[35%] text-right">
                        Last Skipped
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {skippedTracks.map((track) => (
                      <TableRow key={track.id}>
                        <TableCell className="max-w-0 truncate font-medium">
                          <div className="truncate" title={track.name}>
                            {track.name}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-0">
                          <div className="truncate" title={track.artist}>
                            {track.artist}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-0 text-right">
                          <div className="truncate text-right">
                            {track.skipCount}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-0 text-right">
                          <div
                            className="truncate text-right"
                            title={track.lastSkipped}
                          >
                            {track.lastSkipped}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center">
                {loading ? (
                  <p>Loading skipped tracks...</p>
                ) : (
                  <p className="text-muted-foreground">
                    No skipped tracks found
                  </p>
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
