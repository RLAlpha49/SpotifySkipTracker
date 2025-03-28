/**
 * Main skipped tracks layout component
 *
 * Provides a responsive layout for the Skipped Tracks page including:
 * - Header with metadata and controls
 * - Bulk actions for track management
 * - Table of skipped tracks with detailed analytics
 * - Filter controls for data visualization
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Filter, ListMusic, Settings, SkipForward } from "lucide-react";
import React from "react";

interface SkippedTracksLayoutProps {
  isLoading?: boolean;
  header?: React.ReactNode;
  bulkActions?: React.ReactNode;
  tracksTable?: React.ReactNode;
  filters?: React.ReactNode;
}

/**
 * Main layout component for Skipped Tracks page
 *
 * @param props - Component props
 * @returns SkippedTracksLayout component
 */
export function SkippedTracksLayout({
  isLoading = false,
  header,
  bulkActions,
  tracksTable,
  filters,
}: SkippedTracksLayoutProps) {
  return (
    <div className="container mx-auto p-4">
      {/* Header section - always visible on both desktop and mobile */}
      <div className="mb-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-6 w-1/3" />
          </div>
        ) : (
          header || (
            <div className="text-muted-foreground flex h-24 items-center justify-center rounded-lg border">
              <SkipForward className="mr-2 h-6 w-6" />
              <span>Skipped tracks header will be displayed here</span>
            </div>
          )
        )}
      </div>

      {/* Desktop layout */}
      <div className="hidden md:block">
        {/* Bulk actions */}
        <div className="mb-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            bulkActions || (
              <div className="text-muted-foreground flex h-12 items-center justify-center rounded-lg border">
                <Settings className="mr-2 h-5 w-5" />
                <span>Bulk actions will be displayed here</span>
              </div>
            )
          )}
        </div>

        {/* Optional filters */}
        {filters && (
          <div className="mb-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="rounded-lg border p-4">
                {filters || (
                  <div className="text-muted-foreground flex h-10 items-center justify-center">
                    <Filter className="mr-2 h-4 w-4" />
                    <span>Filters will be displayed here</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tracks table */}
        <div>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            tracksTable || (
              <div className="text-muted-foreground flex h-80 items-center justify-center rounded-lg border">
                <ListMusic className="mr-2 h-6 w-6" />
                <span>Skipped tracks table will be displayed here</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Mobile layout - Tabbed interface */}
      <div className="md:hidden">
        <Tabs defaultValue="tracks" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger
              value="tracks"
              className="flex flex-col items-center justify-center text-xs"
            >
              <ListMusic className="mb-1 h-4 w-4" />
              <span>Tracks</span>
            </TabsTrigger>
            <TabsTrigger
              value="actions"
              className="flex flex-col items-center justify-center text-xs"
            >
              <Settings className="mb-1 h-4 w-4" />
              <span>Actions</span>
            </TabsTrigger>
            <TabsTrigger
              value="filters"
              className="flex flex-col items-center justify-center text-xs"
            >
              <Filter className="mb-1 h-4 w-4" />
              <span>Filters</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tracks" className="mt-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              tracksTable || (
                <div className="text-muted-foreground flex h-60 items-center justify-center rounded-lg border">
                  <ListMusic className="mr-2 h-6 w-6" />
                  <span>Skipped tracks will be displayed here</span>
                </div>
              )
            )}
          </TabsContent>

          <TabsContent value="actions" className="mt-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              bulkActions || (
                <div className="text-muted-foreground flex h-40 items-center justify-center rounded-lg border">
                  <Settings className="mr-2 h-5 w-5" />
                  <span>Bulk actions will be displayed here</span>
                </div>
              )
            )}
          </TabsContent>

          <TabsContent value="filters" className="mt-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              filters || (
                <div className="text-muted-foreground flex h-40 items-center justify-center rounded-lg border">
                  <Filter className="mr-2 h-4 w-4" />
                  <span>Filters will be displayed here</span>
                </div>
              )
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
