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
      window.spotify.saveLog("Loaded skipped tracks from storage");
    } catch (error) {
      console.error("Failed to load skipped tracks:", error);
      toast.error("Failed to load data", {
        description: "Could not load skipped tracks data.",
      });

      // Log error
      window.spotify.saveLog(`Error loading skipped tracks: ${error}`);
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
          <ScrollArea className="h-[calc(100vh-220px)] flex-1">
            {skippedTracks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Track</TableHead>
                    <TableHead>Artist</TableHead>
                    <TableHead className="text-right">Skip Count</TableHead>
                    <TableHead className="text-right">Last Skipped</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skippedTracks.map((track) => (
                    <TableRow key={track.id}>
                      <TableCell className="font-medium">
                        {track.name}
                      </TableCell>
                      <TableCell>{track.artist}</TableCell>
                      <TableCell className="text-right">
                        {track.skipCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {track.lastSkipped}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
