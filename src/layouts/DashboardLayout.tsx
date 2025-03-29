/**
 * @packageDocumentation
 * @module DashboardLayout
 * @description Dashboard Layout System
 *
 * Implements a responsive, data-focused layout that presents key application metrics
 * and visualizations in an organized dashboard format. The component intelligently
 * adapts between desktop grid and mobile tab-based layouts depending on screen size.
 *
 * Layout components:
 * - Statistics summary panel with key performance indicators
 * - Recent skipped tracks listing with time and context information
 * - Artist analysis section showing skip patterns by musician
 * - Session overview with listening session metrics and duration
 *
 * Responsive behavior:
 * - Desktop: Multi-column grid layout showing all panels simultaneously
 * - Mobile: Tab-based interface with icon navigation between sections
 * - Graceful loading states with skeleton placeholders
 *
 * Implementation details:
 * - Uses CSS Grid for desktop layout arrangement
 * - Implements a tab system for mobile view content organization
 * - Provides fallback placeholder content when data is not available
 * - Integrates Lucide icons for consistent visual language
 * - Features loading skeletons for progressive enhancement
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart2, Clock, ListMusic, Users } from "lucide-react";
import React from "react";

/**
 * Props interface for DashboardLayout component
 *
 * @property isLoading - Optional boolean that controls the display of skeleton loading states.
 *                       When true, placeholder skeletons appear instead of content panels.
 * @property statisticsSummary - Optional React node for statistics summary content.
 *                               Displays key metrics and overall usage data.
 * @property recentTracks - Optional React node for recently skipped tracks listing.
 *                          Shows chronological list of songs the user has skipped.
 * @property artistSummary - Optional React node for artist analytics content.
 *                           Displays statistics grouped by artist/creator.
 * @property sessionOverview - Optional React node for listening session information.
 *                             Shows detailed data about user listening patterns.
 */
interface DashboardLayoutProps {
  isLoading?: boolean;
  statisticsSummary?: React.ReactNode;
  recentTracks?: React.ReactNode;
  artistSummary?: React.ReactNode;
  sessionOverview?: React.ReactNode;
}

/**
 * Dashboard layout component for data visualization
 *
 * Creates a responsive layout system for displaying Spotify listening statistics
 * and skipped track analytics. Adapts between grid layout (desktop) and
 * tab-based navigation (mobile) based on viewport size.
 *
 * @param props - Component properties
 * @param props.isLoading - Whether skeleton loading states should be shown
 * @param props.statisticsSummary - Content for the statistics summary panel
 * @param props.recentTracks - Content for the recent skipped tracks panel
 * @param props.artistSummary - Content for the artist statistics panel
 * @param props.sessionOverview - Content for the listening session panel
 * @returns Dashboard layout with responsive arrangement of statistics panels
 * @source
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
