/**
 * Application route definitions
 *
 * Defines all application routes and exports the combined route tree.
 * Each route connects a URL path to its corresponding page component:
 *
 * - / → HomePage - Dashboard for monitoring and playback controls
 * - /skipped-tracks → SkippedTracksPage - Track statistics and analysis
 * - /statistics → StatisticsPage - Detailed listening statistics and metrics
 * - /settings → SettingsPage - Application configuration
 */

import React, { Suspense, lazy } from "react";
import { createRoute } from "@tanstack/react-router";
import { RootRoute } from "./__root";
import { LoadingSpinner } from "@/components/ui/spinner";

// Lazy load all page components
const HomePage = lazy(() => import("../pages/HomePage"));
const SkippedTracksPage = lazy(() => import("../pages/SkippedTracksPage"));
const StatisticsPage = lazy(() => import("../pages/StatisticsPage"));
const SettingsPage = lazy(() => import("../pages/SettingsPage"));

// Loading component for suspense fallback
const PageLoader = () => (
  <div className="flex h-[calc(100vh-120px)] w-full items-center justify-center">
    <LoadingSpinner size="lg" text="Loading page..." />
  </div>
);

/**
 * Home route - Dashboard with playback controls and monitoring
 * Path: "/"
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
 * Skipped Tracks route - Analytics and statistics for skipped tracks
 * Path: "/skipped-tracks"
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
 * Statistics route - Detailed listening statistics and metrics
 * Path: "/statistics"
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
 * Settings route - Application configuration
 * Path: "/settings"
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
 * Combined route tree for application routing
 * Passed to the router configuration in router.tsx
 */
export const rootTree = RootRoute.addChildren([
  HomeRoute,
  SkippedTracksRoute,
  StatisticsRoute,
  SettingsRoute,
]);
