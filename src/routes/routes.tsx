/**
 * Application route definitions
 *
 * Defines all application routes and exports the combined route tree.
 * Each route connects a URL path to its corresponding page component:
 *
 * - / → HomePage - Dashboard for monitoring and playback controls
 * - /skipped-tracks → SkippedTracksPage - Track statistics and analysis
 * - /settings → SettingsPage - Application configuration
 */

import { createRoute } from "@tanstack/react-router";
import { RootRoute } from "./__root";
import HomePage from "../pages/HomePage";
import SkippedTracksPage from "@/pages/SkippedTracksPage";
import SettingsPage from "@/pages/SettingsPage";

/**
 * Home route - Dashboard with playback controls and monitoring
 * Path: "/"
 */
export const HomeRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/",
  component: HomePage,
});

/**
 * Skipped Tracks route - Analytics and statistics for skipped tracks
 * Path: "/skipped-tracks"
 */
export const SkippedTracksRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/skipped-tracks",
  component: SkippedTracksPage,
});

/**
 * Settings route - Application configuration
 * Path: "/settings"
 */
export const SettingsRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/settings",
  component: SettingsPage,
});

/**
 * Combined route tree for application routing
 * Passed to the router configuration in router.tsx
 */
export const rootTree = RootRoute.addChildren([
  HomeRoute,
  SkippedTracksRoute,
  SettingsRoute,
]);
