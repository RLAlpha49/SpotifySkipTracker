/**
 * @packageDocumentation
 * @module routes
 * @description Application Routing System Definition
 *
 * Configures the complete routing architecture for the application by:
 * - Defining all available routes and their URL paths
 * - Connecting each route to its corresponding page component
 * - Implementing route-level code splitting with lazy loading
 * - Building and exporting the complete route hierarchy
 *
 * Route structure:
 * - / → HomePage: Real-time monitoring dashboard for Spotify playback
 * - /skipped-tracks → SkippedTracksPage: Detailed analysis of skipped music tracks
 * - /statistics → StatisticsPage: Comprehensive listening statistics and visualizations
 * - /settings → SettingsPage: Application configuration and preferences
 *
 * Performance optimizations:
 * - Dynamic imports with React.lazy for code splitting
 * - Suspense boundaries with loading indicators for each route
 * - Single source of truth for route definitions
 * - Isolated loading states for each route component
 *
 * This module integrates with the root route from __root.tsx and is consumed
 * by router.tsx to create the final router configuration.
 */

import { LoadingSpinner } from "@/components/ui/spinner";
import { createRoute } from "@tanstack/react-router";
import React, { Suspense, lazy } from "react";
import { RootRoute } from "./__root";

// Lazy load all page components
const HomePage = lazy(() => import("../pages/HomePage"));
const SkippedTracksPage = lazy(() => import("../pages/SkippedTracksPage"));
const StatisticsPage = lazy(() => import("../pages/StatisticsPage"));
const SettingsPage = lazy(() => import("../pages/SettingsPage"));

/**
 * Loading Indicator Component
 *
 * Provides a consistent loading experience when route components
 * are being dynamically loaded. Displays a centered spinner with
 * loading text to maintain UI stability during transitions.
 *
 * @returns React component for route loading state
 * @source
 * @notExported
 */
const PageLoader = () => (
  <div className="flex h-[calc(100vh-120px)] w-full items-center justify-center">
    <LoadingSpinner size="lg" text="Loading page..." />
  </div>
);

/**
 * Home Route Configuration
 *
 * Defines the application's main dashboard route with:
 * - Path: "/" (application root)
 * - Component: HomePage (loaded dynamically)
 * - Parent: RootRoute (inherits layout and structure)
 * - Loading: PageLoader (displays during code loading)
 *
 * This route provides the primary monitoring interface for
 * real-time Spotify playback tracking and status overview.
 *
 * @source
 */
export const HomeRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <HomePage />
    </Suspense>
  ),
});

/**
 * Skipped Tracks Route Configuration
 *
 * Defines the track analysis route with:
 * - Path: "/skipped-tracks"
 * - Component: SkippedTracksPage (loaded dynamically)
 * - Parent: RootRoute (inherits layout and structure)
 * - Loading: PageLoader (displays during code loading)
 *
 * This route provides detailed insights into track skip patterns
 * and tools for library management based on skip analysis.
 *
 * @source
 */
export const SkippedTracksRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/skipped-tracks",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <SkippedTracksPage />
    </Suspense>
  ),
});

/**
 * Statistics Route Configuration
 *
 * Defines the analytics dashboard route with:
 * - Path: "/statistics"
 * - Component: StatisticsPage (loaded dynamically)
 * - Parent: RootRoute (inherits layout and structure)
 * - Loading: PageLoader (displays during code loading)
 *
 * This route provides comprehensive visualizations and metrics
 * for understanding music listening habits and trends.
 *
 * @source
 */
export const StatisticsRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/statistics",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <StatisticsPage />
    </Suspense>
  ),
});

/**
 * Settings Route Configuration
 *
 * Defines the application configuration route with:
 * - Path: "/settings"
 * - Component: SettingsPage (loaded dynamically)
 * - Parent: RootRoute (inherits layout and structure)
 * - Loading: PageLoader (displays during code loading)
 *
 * This route provides interfaces for configuring application
 * behavior, authentication, and user preferences.
 *
 * @source
 */
export const SettingsRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/settings",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <SettingsPage />
    </Suspense>
  ),
});

/**
 * Complete Route Hierarchy
 *
 * Combines all route definitions into a single hierarchical tree
 * with RootRoute as the parent. This structure is exported for use
 * in the router configuration to establish the complete navigation system.
 *
 * The tree structure ensures proper nesting and inheritance of layouts
 * while maintaining the route relationships for navigation.
 *
 * @source
 */
export const rootTree = RootRoute.addChildren([
  HomeRoute,
  SkippedTracksRoute,
  StatisticsRoute,
  SettingsRoute,
]);
