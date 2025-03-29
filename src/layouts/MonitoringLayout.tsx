/**
 * @packageDocumentation
 * @module MonitoringLayout
 * @description Playback Monitoring Control Center
 *
 * Provides a comprehensive interface for real-time Spotify playback monitoring
 * and application diagnostics. This layout organizes critical monitoring tools
 * into a logical arrangement for both desktop and mobile form factors.
 *
 * Core monitoring components:
 * - Live playback card showing current track, artist and progress
 * - Monitoring control panel with service status and toggle switches
 * - Application logs console with real-time event streaming
 * - Optional settings panel for monitoring configuration
 *
 * Responsive architecture:
 * - Desktop: Two-column layout with side-by-side cards and full-width logs
 * - Mobile: Tab-based navigation with dedicated sections for each function
 * - Progressive loading with skeleton placeholders for visual stability
 *
 * Technical features:
 * - Flexible prop-based content injection for each panel
 * - Conditional rendering for optional components
 * - Consistent error and empty states with informative messages
 * - Iconography with Lucide components for visual semantics
 * - Optimized layout transitions between viewport sizes
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

/**
 * Props interface for MonitoringLayout component
 *
 * @property isLoading - Optional boolean flag to control loading state display.
 *                       When true, shows skeleton placeholder instead of content.
 * @property nowPlayingCard - Optional React node for currently playing track display.
 *                           Shows song title, artist, album, and playback progress.
 * @property monitoringCard - Optional React node for monitoring service controls.
 *                           Contains status indicators and start/stop functionality.
 * @property logsCard - Optional React node for application log display.
 *                     Shows scrollable real-time application event logs.
 * @property settingsCard - Optional React node for monitoring settings.
 *                         Provides configuration options for monitoring behavior.
 */
interface MonitoringLayoutProps {
  isLoading?: boolean;
  nowPlayingCard?: React.ReactNode;
  monitoringCard?: React.ReactNode;
  logsCard?: React.ReactNode;
  settingsCard?: React.ReactNode;
}

/**
 * Playback monitoring control layout component
 *
 * Creates a responsive layout for monitoring Spotify playback and viewing
 * application diagnostic information. Provides different arrangements
 * for desktop and mobile viewports to optimize information density.
 *
 * @param props - Component properties
 * @param props.isLoading - Whether to display skeleton loading state
 * @param props.nowPlayingCard - Content for currently playing track display
 * @param props.monitoringCard - Content for monitoring service controls
 * @param props.logsCard - Content for application log display
 * @param props.settingsCard - Optional content for monitoring settings
 * @returns MonitoringLayout component with responsive panel arrangement
 * @source
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
