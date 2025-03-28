/**
 * Main dashboard layout component
 *
 * Provides a responsive grid layout for dashboard panels including:
 * - Summary statistics
 * - Recent skipped tracks
 * - Artist statistics
 * - Session overview
 * - Quick actions
 */

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart2, Clock, Disc, ListMusic, Users } from "lucide-react";
import React from "react";

interface DashboardLayoutProps {
  isLoading?: boolean;
  statisticsSummary?: React.ReactNode;
  recentTracks?: React.ReactNode;
  artistSummary?: React.ReactNode;
  sessionOverview?: React.ReactNode;
  dashboardActions?: React.ReactNode;
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
  dashboardActions,
}: DashboardLayoutProps) {
  // For desktop layout, we use a grid system
  // For mobile, we use a tabbed interface for better space utilization

  return (
    <div className="container mx-auto p-4">
      {/* Desktop layout - Grid system */}
      <div className="hidden md:grid md:grid-cols-12 md:gap-4">
        {/* Top row - Statistics Summary (spans 8 columns) and Actions (spans 4 columns) */}
        <div className="col-span-8">
          <Card className="h-full">
            {isLoading ? (
              <div className="space-y-4 p-4">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              statisticsSummary || (
                <div className="text-muted-foreground flex h-48 items-center justify-center p-4">
                  Statistics summary will be displayed here
                </div>
              )
            )}
          </Card>
        </div>

        <div className="col-span-4">
          <Card className="h-full">
            {isLoading ? (
              <div className="space-y-4 p-4">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              dashboardActions || (
                <div className="text-muted-foreground flex h-48 items-center justify-center p-4">
                  Dashboard actions will be displayed here
                </div>
              )
            )}
          </Card>
        </div>

        {/* Middle row - Recent Tracks (spans full width) */}
        <div className="col-span-12">
          <Card className="h-full">
            {isLoading ? (
              <div className="space-y-4 p-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              recentTracks || (
                <div className="text-muted-foreground flex h-48 items-center justify-center p-4">
                  Recent skipped tracks will be displayed here
                </div>
              )
            )}
          </Card>
        </div>

        {/* Bottom row - Artist Summary (spans 6 columns) and Session Overview (spans 6 columns) */}
        <div className="col-span-6">
          <Card className="h-full">
            {isLoading ? (
              <div className="space-y-4 p-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              artistSummary || (
                <div className="text-muted-foreground flex h-48 items-center justify-center p-4">
                  Artist summary will be displayed here
                </div>
              )
            )}
          </Card>
        </div>

        <div className="col-span-6">
          <Card className="h-full">
            {isLoading ? (
              <div className="space-y-4 p-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              sessionOverview || (
                <div className="text-muted-foreground flex h-48 items-center justify-center p-4">
                  Session overview will be displayed here
                </div>
              )
            )}
          </Card>
        </div>
      </div>

      {/* Mobile layout - Tabbed interface */}
      <div className="md:hidden">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
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
            <TabsTrigger
              value="actions"
              className="flex flex-col items-center justify-center text-xs"
            >
              <Disc className="mb-1 h-4 w-4" />
              <span>Actions</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <Card>
              {isLoading ? (
                <div className="space-y-4 p-4">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : (
                statisticsSummary || (
                  <div className="text-muted-foreground flex h-48 items-center justify-center p-4">
                    Statistics summary will be displayed here
                  </div>
                )
              )}
            </Card>
          </TabsContent>

          <TabsContent value="tracks" className="mt-4">
            <Card>
              {isLoading ? (
                <div className="space-y-4 p-4">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                recentTracks || (
                  <div className="text-muted-foreground flex h-48 items-center justify-center p-4">
                    Recent skipped tracks will be displayed here
                  </div>
                )
              )}
            </Card>
          </TabsContent>

          <TabsContent value="artists" className="mt-4">
            <Card>
              {isLoading ? (
                <div className="space-y-4 p-4">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                artistSummary || (
                  <div className="text-muted-foreground flex h-48 items-center justify-center p-4">
                    Artist summary will be displayed here
                  </div>
                )
              )}
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="mt-4">
            <Card>
              {isLoading ? (
                <div className="space-y-4 p-4">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                sessionOverview || (
                  <div className="text-muted-foreground flex h-48 items-center justify-center p-4">
                    Session overview will be displayed here
                  </div>
                )
              )}
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="mt-4">
            <Card>
              {isLoading ? (
                <div className="space-y-4 p-4">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                dashboardActions || (
                  <div className="text-muted-foreground flex h-48 items-center justify-center p-4">
                    Dashboard actions will be displayed here
                  </div>
                )
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
