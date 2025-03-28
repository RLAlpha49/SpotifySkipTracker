/**
 * Main dashboard layout component
 *
 * Provides a responsive grid layout for dashboard panels including:
 * - Summary statistics
 * - Recent skipped tracks
 * - Artist statistics
 * - Session overview
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart2, Clock, ListMusic, Users } from "lucide-react";
import React from "react";

interface DashboardLayoutProps {
  isLoading?: boolean;
  statisticsSummary?: React.ReactNode;
  recentTracks?: React.ReactNode;
  artistSummary?: React.ReactNode;
  sessionOverview?: React.ReactNode;
}

/**
 * Main dashboard layout component
 *
 * @param props - Component props
 * @returns Dashboard layout component
 */
export function DashboardLayout({
  isLoading = false,
  statisticsSummary,
  recentTracks,
  artistSummary,
  sessionOverview,
}: DashboardLayoutProps) {
  return (
    <div className="container mx-auto">
      {/* Desktop layout - Grid system */}
      <div className="hidden md:grid md:grid-cols-12 md:gap-4">
        {/* Top row - Statistics Summary (spans full width) */}
        <div className="col-span-12 mb-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            statisticsSummary || (
              <div className="text-muted-foreground flex h-48 items-center justify-center">
                Statistics summary will be displayed here
              </div>
            )
          )}
        </div>

        {/* Middle row - Recent Tracks (spans full width) */}
        <div className="col-span-12 mb-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            recentTracks || (
              <div className="text-muted-foreground flex h-48 items-center justify-center">
                Recent skipped tracks will be displayed here
              </div>
            )
          )}
        </div>

        {/* Bottom row - Artist Summary (spans 6 columns) and Session Overview (spans 6 columns) */}
        <div className="col-span-6 mb-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            artistSummary || (
              <div className="text-muted-foreground flex h-48 items-center justify-center">
                Artist summary will be displayed here
              </div>
            )
          )}
        </div>

        <div className="col-span-6 mb-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            sessionOverview || (
              <div className="text-muted-foreground flex h-48 items-center justify-center">
                Session overview will be displayed here
              </div>
            )
          )}
        </div>
      </div>

      {/* Mobile layout - Tabbed interface */}
      <div className="md:hidden">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger
              value="overview"
              className="flex flex-col items-center justify-center text-xs"
            >
              <BarChart2 className="mb-1 h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger
              value="tracks"
              className="flex flex-col items-center justify-center text-xs"
            >
              <ListMusic className="mb-1 h-4 w-4" />
              <span>Tracks</span>
            </TabsTrigger>
            <TabsTrigger
              value="artists"
              className="flex flex-col items-center justify-center text-xs"
            >
              <Users className="mb-1 h-4 w-4" />
              <span>Artists</span>
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="flex flex-col items-center justify-center text-xs"
            >
              <Clock className="mb-1 h-4 w-4" />
              <span>Sessions</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              statisticsSummary || (
                <div className="text-muted-foreground flex h-48 items-center justify-center">
                  Statistics summary will be displayed here
                </div>
              )
            )}
          </TabsContent>

          <TabsContent value="tracks" className="mt-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              recentTracks || (
                <div className="text-muted-foreground flex h-48 items-center justify-center">
                  Recent skipped tracks will be displayed here
                </div>
              )
            )}
          </TabsContent>

          <TabsContent value="artists" className="mt-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              artistSummary || (
                <div className="text-muted-foreground flex h-48 items-center justify-center">
                  Artist summary will be displayed here
                </div>
              )
            )}
          </TabsContent>

          <TabsContent value="sessions" className="mt-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              sessionOverview || (
                <div className="text-muted-foreground flex h-48 items-center justify-center">
                  Session overview will be displayed here
                </div>
              )
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
