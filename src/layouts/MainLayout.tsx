/**
 * @packageDocumentation
 * @module MainLayout
 * @description Main Application Layout Component
 *
 * Serves as the primary structural container for the entire application,
 * establishing a consistent visual hierarchy and navigation system.
 *
 * Key structural elements:
 * - App header with application title and theme controls
 * - Draggable region for frameless window movement
 * - Scrollable content area with overflow handling
 * - Persistent bottom navigation bar with active route highlighting
 *
 * Accessibility features:
 * - Semantic HTML structure with proper landmarks
 * - Focus-visible indicators for keyboard navigation
 * - Appropriate contrast between content and background
 *
 * Technical implementation:
 * - Uses CSS app-region for Electron window dragging
 * - Implements TanStack Router integration for navigation
 * - Lazy-loads theme toggle component for performance
 * - Provides route matching for navigation state management
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/ui/spinner";
import { Link, useMatch } from "@tanstack/react-router";
import {
  BarChartIcon,
  HomeIcon,
  SettingsIcon,
  SkipForwardIcon,
} from "lucide-react";
import React, { lazy, ReactNode, Suspense } from "react";

const ToggleTheme = lazy(() => import("@/components/ToggleTheme"));

/**
 * Props interface for MainLayout component
 *
 * @property children - React nodes to render in the main content area. These elements
 *                      will be placed in a scrollable container with proper overflow handling.
 */
interface MainLayoutProps {
  children: ReactNode;
}

/**
 * Main layout wrapper for the application
 *
 * Provides the primary structural layout for all pages in the application,
 * including header, scrollable content area, and bottom navigation.
 * Handles window dragging and ensures consistent application appearance.
 *
 * @param props - Component properties
 * @param props.children - Content to render in the main scrollable area
 * @returns MainLayout component with consistent app structure
 * @source
 */
export default function MainLayout({ children }: MainLayoutProps) {
  // Use useMatch to check each route directly
  const isHomeActive =
    useMatch({ from: "/", strict: false, shouldThrow: false }) !== undefined;
  const isSkippedTracksActive =
    useMatch({ from: "/skipped-tracks", strict: false, shouldThrow: false }) !==
    undefined;
  const isStatisticsActive =
    useMatch({ from: "/statistics", strict: false, shouldThrow: false }) !==
    undefined;
  const isSettingsActive =
    useMatch({ from: "/settings", strict: false, shouldThrow: false }) !==
    undefined;

  return (
    <div className="flex h-screen flex-col">
      {/* App header with draggable region */}
      <header className="flex h-14 items-center border-b px-4 backdrop-blur-sm dark:border-gray-800">
        <div className="app-region-drag flex flex-1 items-center">
          <h1 className="text-xl font-semibold">Spotify Skip Tracker</h1>
        </div>
        <div className="app-region-no-drag shrink-0">
          <Suspense fallback={<LoadingSpinner size="sm" />}>
            <ToggleTheme />
          </Suspense>
        </div>
      </header>

      {/* Main Content - scrollable */}
      <ScrollArea className="flex-1 overflow-hidden">{children}</ScrollArea>

      {/* Bottom navigation */}
      <nav className="bg-background sticky bottom-0 border-t py-2 dark:border-slate-800">
        <div className="container flex justify-around">
          <Link
            to="/"
            className={`flex flex-col items-center p-2 ${
              isHomeActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <HomeIcon className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </Link>

          <Link
            to="/skipped-tracks"
            className={`flex flex-col items-center p-2 ${
              isSkippedTracksActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <SkipForwardIcon className="h-5 w-5" />
            <span className="text-xs">Skips</span>
          </Link>

          <Link
            to="/statistics"
            className={`flex flex-col items-center p-2 ${
              isStatisticsActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <BarChartIcon className="h-5 w-5" />
            <span className="text-xs">Stats</span>
          </Link>

          <Link
            to="/settings"
            className={`flex flex-col items-center p-2 ${
              isSettingsActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <SettingsIcon className="h-5 w-5" />
            <span className="text-xs">Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
