import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  SkipForward,
  Calendar,
  Music,
  User,
  PlayCircle,
  Repeat,
  Laptop,
} from "lucide-react";
import { StatisticsData } from "@/types/statistics";
import { NoDataMessage } from "./NoDataMessage";
import { formatPercent } from "./utils";

interface OverviewTabProps {
  loading: boolean;
  statistics: StatisticsData | null;
  statsSummary: {
    totalListeningTime: string;
    skipRate: string;
    skipRateValue: number;
    discoveryRate: string;
    totalTracks: number;
    totalArtists: number;
    mostActiveDay: string;
    peakListeningHour: string;
    recentTracksCount: number;
    recentSkipCount: number;
    recentListeningTime: string;
  } | null;
}

export function OverviewTab({
  loading,
  statistics,
  statsSummary,
}: OverviewTabProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array(6)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="mt-2 h-4 w-32" />
              </CardContent>
            </Card>
          ))}
      </div>
    );
  }

  if (!statistics) {
    return (
      <NoDataMessage message="No statistics data available yet. Keep listening to music to generate insights!" />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            Total Listening Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {statsSummary?.totalListeningTime}
          </div>
          <p className="text-muted-foreground text-xs">
            {statistics.totalUniqueTracks} unique tracks played
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <SkipForward className="h-4 w-4" />
            Skip Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsSummary?.skipRate}</div>
          <Progress
            value={
              statsSummary?.skipRateValue ? statsSummary.skipRateValue * 100 : 0
            }
            className="mt-2 h-2"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <User className="h-4 w-4" />
            Artists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {statistics.totalUniqueArtists}
          </div>
          <p className="text-muted-foreground text-xs">
            Discovery rate: {statsSummary?.discoveryRate}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4" />
            Most Active Day
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {statsSummary?.mostActiveDay}
          </div>
          <p className="text-muted-foreground text-xs">
            Peak hour: {statsSummary?.peakListeningHour}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <PlayCircle className="h-4 w-4" />
            Today&apos;s Listening
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {statsSummary?.recentListeningTime}
          </div>
          <p className="text-muted-foreground text-xs">
            {statsSummary?.recentTracksCount} tracks (
            {statsSummary?.recentSkipCount} skipped)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Music className="h-4 w-4" />
            Tracks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {statistics.totalUniqueTracks}
          </div>
          <p className="text-muted-foreground text-xs">
            {Object.keys(statistics.artistMetrics).length} artists tracked
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Repeat className="h-4 w-4" />
            Repeat Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatPercent(statistics.repeatListeningRate || 0)}
          </div>
          <p className="text-muted-foreground text-xs">
            Tracks repeated within sessions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Laptop className="h-4 w-4" />
            Device Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Object.keys(statistics.deviceMetrics || {}).length}
          </div>
          <p className="text-muted-foreground text-xs">Devices tracked</p>
        </CardContent>
      </Card>
    </div>
  );
}
