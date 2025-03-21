import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Music,
  Clock,
  User,
  SkipForward,
  ThumbsUp,
  Search,
  SortAsc,
  Sparkles,
  PlayCircle,
} from "lucide-react";
import { StatisticsData } from "@/types/statistics";
import { NoDataMessage } from "./NoDataMessage";
import { formatPercent, formatTime } from "./utils";

interface ArtistsTabProps {
  loading: boolean;
  statistics: StatisticsData | null;
}

export function ArtistsTab({ loading, statistics }: ArtistsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("recent");
  const [sortDirection, setSortDirection] = useState("desc");

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/40 overflow-hidden transition-all duration-200 md:col-span-2">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40 overflow-hidden transition-all duration-200">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40 overflow-hidden transition-all duration-200">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40 overflow-hidden transition-all duration-200 md:col-span-2">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="pt-4">
            <Skeleton className="mb-4 h-8 w-full" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array(8)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-md" />
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!statistics || Object.keys(statistics.artistMetrics).length === 0) {
    return (
      <NoDataMessage message="No artist data available yet. Keep listening to music to generate insights!" />
    );
  }

  // Function to get the text color based on skip rate
  const getSkipRateTextColor = (skipRate: number) => {
    if (skipRate < 0.3) return "text-emerald-500";
    if (skipRate < 0.5) return "text-amber-500";
    return "text-rose-500";
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="hover:border-primary/30 group overflow-hidden transition-all duration-200 hover:shadow-md md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Music className="text-primary h-4 w-4" />
            Top Artists by Listening Time
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            {Object.entries(statistics.artistMetrics)
              .sort((a, b) => b[1].listeningTimeMs - a[1].listeningTimeMs)
              .slice(0, 10)
              .map(([artistId, data], index) => {
                const maxTime = Math.max(
                  ...Object.values(statistics.artistMetrics).map(
                    (a) => a.listeningTimeMs,
                  ),
                );
                const percentage =
                  maxTime > 0 ? (data.listeningTimeMs / maxTime) * 100 : 0;

                // Determine if this is a top artist
                const isTopArtist = index < 3;

                return (
                  <div key={artistId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span
                        className={`font-medium ${isTopArtist ? "text-primary" : ""}`}
                      >
                        {isTopArtist && (
                          <span className="mr-1">#{index + 1}</span>
                        )}
                        {data.name}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                        <Clock className="h-3 w-3" />
                        {formatTime(data.listeningTimeMs)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Progress
                          value={percentage}
                          className={`h-2.5 ${isTopArtist ? "bg-primary" : "bg-primary/60"}`}
                        />
                      </div>
                      <div className="flex w-32 items-center justify-end gap-1.5 text-right text-xs">
                        <PlayCircle className="text-muted-foreground h-3 w-3" />
                        <span>{data.tracksPlayed}</span>
                        <span className="text-muted-foreground mx-1">•</span>
                        <span className={getSkipRateTextColor(data.skipRate)}>
                          {formatPercent(data.skipRate)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      <Card className="group overflow-hidden transition-all duration-200 hover:border-rose-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <SkipForward className="h-4 w-4 text-rose-500" />
            Artists with Highest Skip Rates
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {Object.entries(statistics.artistMetrics)
              .filter(([, data]) => data.tracksPlayed >= 1)
              .sort((a, b) => {
                // First sort by skip rate (highest first)
                const skipRateDiff = b[1].skipRate - a[1].skipRate;

                // If skip rates are equal (or very close), sort by number of tracks played (highest first)
                if (Math.abs(skipRateDiff) < 0.001) {
                  return b[1].tracksPlayed - a[1].tracksPlayed;
                }

                return skipRateDiff;
              })
              .slice(0, 8)
              .map(([artistId, data], index) => (
                <div
                  key={artistId}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-md px-2 py-1.5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-4 text-xs font-medium">
                      {index + 1}
                    </span>
                    <div className="mr-2 truncate font-medium">{data.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      <PlayCircle className="h-3 w-3" />
                      {data.tracksPlayed}
                    </span>
                    <div
                      className={`text-sm font-semibold ${getSkipRateTextColor(data.skipRate)}`}
                    >
                      {formatPercent(data.skipRate)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card className="group overflow-hidden transition-all duration-200 hover:border-emerald-200 hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ThumbsUp className="h-4 w-4 text-emerald-500" />
            Artists with Lowest Skip Rates
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {Object.entries(statistics.artistMetrics)
              .filter(([, data]) => data.tracksPlayed >= 1)
              .sort((a, b) => {
                // First sort by skip rate (lowest first)
                const skipRateDiff = a[1].skipRate - b[1].skipRate;

                // If skip rates are equal (or very close), sort by number of tracks played (highest first)
                if (Math.abs(skipRateDiff) < 0.001) {
                  return b[1].tracksPlayed - a[1].tracksPlayed;
                }

                return skipRateDiff;
              })
              .slice(0, 8)
              .map(([artistId, data], index) => (
                <div
                  key={artistId}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-md px-2 py-1.5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-4 text-xs font-medium">
                      {index + 1}
                    </span>
                    <div className="mr-2 truncate font-medium">{data.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      <PlayCircle className="h-3 w-3" />
                      {data.tracksPlayed}
                    </span>
                    <div className="text-sm font-semibold text-emerald-500">
                      {formatPercent(data.skipRate)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card className="group overflow-hidden transition-all duration-200 hover:border-violet-200 hover:shadow-md md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-violet-500" />
            New Artist Discoveries
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {!statistics.recentDiscoveries ||
          statistics.recentDiscoveries.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No new artist discoveries in the last 30 days.
            </p>
          ) : (
            <>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                  <Input
                    placeholder="Search artists..."
                    className="flex-1 pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={sortField} onValueChange={setSortField}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Discovery Date</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="plays">Tracks Played</SelectItem>
                      <SelectItem value="skip-rate">Skip Rate</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={sortDirection}
                    onValueChange={setSortDirection}
                  >
                    <SelectTrigger className="w-28">
                      <SortAsc className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <ScrollArea className="h-[260px] pr-4">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {statistics.recentDiscoveries
                    .filter(
                      (id) =>
                        statistics.artistMetrics &&
                        statistics.artistMetrics[id] &&
                        (!searchTerm ||
                          statistics.artistMetrics[id].name
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase())),
                    )
                    // Map to add discovery index before sorting
                    .map((id, index) => ({
                      id,
                      artist: statistics.artistMetrics[id],
                      discoveryIndex: index, // Higher index = more recently discovered
                    }))
                    .sort((a, b) => {
                      const isAsc = sortDirection === "asc";

                      // Helper function to handle both ascending and descending
                      const compare = (valA: number, valB: number) => {
                        if (valA < valB) return isAsc ? -1 : 1;
                        if (valA > valB) return isAsc ? 1 : -1;
                        return 0;
                      };

                      switch (sortField) {
                        case "name":
                          return isAsc
                            ? a.artist.name.localeCompare(b.artist.name)
                            : b.artist.name.localeCompare(a.artist.name);
                        case "plays":
                          return compare(
                            a.artist.tracksPlayed,
                            b.artist.tracksPlayed,
                          );
                        case "skip-rate":
                          return compare(a.artist.skipRate, b.artist.skipRate);
                        case "recent":
                        default:
                          // For recent, sort by discovery index (higher = more recent)
                          return compare(b.discoveryIndex, a.discoveryIndex);
                      }
                    })
                    .map(({ id, artist, discoveryIndex }, index, array) => {
                      // Create a consistent discovery indicator (higher = more recent)
                      const discoveryPosition = discoveryIndex + 1;

                      // Get color based on how recent the discovery is
                      const getDiscoveryColor = (position: number) => {
                        if (position >= array.length - 2)
                          return "border-violet-400 bg-violet-500/10";
                        if (position >= array.length - 7)
                          return "border-violet-300/70 bg-violet-500/5";
                        return "border-violet-200/40 bg-muted/40";
                      };

                      return (
                        <div
                          key={id}
                          className={`rounded-lg border p-3 ${getDiscoveryColor(discoveryPosition)} transition-all duration-200 hover:shadow-sm`}
                        >
                          <div className="truncate font-medium">
                            {artist.name}
                          </div>
                          <div className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
                            <PlayCircle className="h-3 w-3" />
                            <span>{artist.tracksPlayed} tracks</span>
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-xs">
                            <SkipForward className="text-muted-foreground h-3 w-3" />
                            <span
                              className={getSkipRateTextColor(artist.skipRate)}
                            >
                              {formatPercent(artist.skipRate)}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs font-medium text-violet-500">
                              <Sparkles className="h-3 w-3" />
                              <span>#{discoveryPosition}</span>
                            </div>
                            {discoveryPosition >= array.length - 2 && (
                              <div className="rounded-sm bg-violet-500/20 px-1.5 py-0.5 text-xs font-medium text-violet-500">
                                New
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </ScrollArea>
            </>
          )}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-center text-sm font-medium">
            <User className="h-4 w-4 text-violet-500" />
            <span>Discovery rate:</span>
            <span className="text-violet-500">
              {formatPercent(statistics.discoveryRate || 0)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
