/**
 * Main monitoring layout component
 *
 * Provides a responsive layout for the Monitoring tab including:
 * - Current playback information
 * - Monitoring status and controls
 * - Application logs
 * - Optional settings panel
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  ListMusic,
  RadioTower,
  Settings,
  Terminal,
} from "lucide-react";
import React from "react";

interface MonitoringLayoutProps {
  isLoading?: boolean;
  nowPlayingCard?: React.ReactNode;
  monitoringCard?: React.ReactNode;
  logsCard?: React.ReactNode;
  settingsCard?: React.ReactNode;
}

/**
 * Main layout component for Monitoring tab on homepage
 *
 * @param props - Component props
 * @returns MonitoringLayout component
 */
export function MonitoringLayout({
  isLoading = false,
  nowPlayingCard,
  monitoringCard,
  logsCard,
  settingsCard,
}: MonitoringLayoutProps) {
  return (
    <div className="container mx-auto">
      {/* Desktop layout - Grid system */}
      <div className="hidden md:flex md:flex-col md:gap-4">
        {/* First row - Now Playing Card and Monitoring Card side by side */}
        <div className="grid grid-cols-2 gap-4">
          {/* Now Playing Card */}
          <div>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              nowPlayingCard || (
                <div className="text-muted-foreground flex h-48 items-center justify-center">
                  <ListMusic className="mr-2 h-6 w-6" />
                  <span>Now playing information will be displayed here</span>
                </div>
              )
            )}
          </div>

          {/* Monitoring Card */}
          <div>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              monitoringCard || (
                <div className="text-muted-foreground flex h-48 items-center justify-center">
                  <RadioTower className="mr-2 h-6 w-6" />
                  <span>Monitoring controls will be displayed here</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Second row - Logs Card (spans full width) */}
        <div>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            logsCard || (
              <div className="text-muted-foreground flex h-48 items-center justify-center">
                <Terminal className="mr-2 h-6 w-6" />
                <span>Application logs will be displayed here</span>
              </div>
            )
          )}
        </div>

        {/* Third row - Optional Settings Card */}
        {settingsCard && (
          <div>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              settingsCard || (
                <div className="text-muted-foreground flex h-48 items-center justify-center">
                  <Settings className="mr-2 h-6 w-6" />
                  <span>Settings will be displayed here</span>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Mobile layout - Tabbed interface */}
      <div className="md:hidden">
        <Tabs defaultValue="playback" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger
              value="playback"
              className="flex flex-col items-center justify-center text-xs"
            >
              <ListMusic className="mb-1 h-4 w-4" />
              <span>Playback</span>
            </TabsTrigger>
            <TabsTrigger
              value="monitoring"
              className="flex flex-col items-center justify-center text-xs"
            >
              <Activity className="mb-1 h-4 w-4" />
              <span>Monitor</span>
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="flex flex-col items-center justify-center text-xs"
            >
              <Terminal className="mb-1 h-4 w-4" />
              <span>Logs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="playback" className="mt-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              nowPlayingCard || (
                <div className="text-muted-foreground flex h-48 items-center justify-center">
                  <ListMusic className="mr-2 h-6 w-6" />
                  <span>Now playing information will be displayed here</span>
                </div>
              )
            )}
          </TabsContent>

          <TabsContent value="monitoring" className="mt-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              monitoringCard || (
                <div className="text-muted-foreground flex h-48 items-center justify-center">
                  <RadioTower className="mr-2 h-6 w-6" />
                  <span>Monitoring controls will be displayed here</span>
                </div>
              )
            )}
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              logsCard || (
                <div className="text-muted-foreground flex h-48 items-center justify-center">
                  <Terminal className="mr-2 h-6 w-6" />
                  <span>Application logs will be displayed here</span>
                </div>
              )
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
