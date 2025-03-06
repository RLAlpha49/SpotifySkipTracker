/**
 * Application Route Definitions
 *
 * This file defines all the application routes and exports them for use by the router.
 * It creates routes for the main pages of the application:
 * - Home: Dashboard showing current playback and monitoring controls
 * - Skipped Tracks: Analytics of skipped tracks and patterns
 * - Settings: Application configuration
 *
 * Each route is associated with its corresponding page component and path.
 */

import { createRoute } from "@tanstack/react-router";
import { RootRoute } from "./__root";
import HomePage from "../pages/HomePage";
import SkippedTracksPage from "@/pages/SkippedTracksPage";
import SettingsPage from "@/pages/SettingsPage";

// TODO: Steps to add a new route:
// 1. Create a new page component in the '../pages/' directory (e.g., NewPage.tsx)
// 2. Import the new page component at the top of this file
// 3. Define a new route for the page using createRoute()
// 4. Add the new route to the routeTree in RootRoute.addChildren([...])
// 5. Add a new Link in the navigation section of RootRoute if needed

// Example of adding a new route:
// 1. Create '../pages/NewPage.tsx'
// 2. Import: import NewPage from '../pages/NewPage';
// 3. Define route:
//    const NewRoute = createRoute({
//      getParentRoute: () => RootRoute,
//      path: '/new',
//      component: NewPage,
//    });
// 4. Add to routeTree: RootRoute.addChildren([HomeRoute, NewRoute, ...])
// 5. Add Link: <Link to="/new">New Page</Link>

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
 * Skipped Tracks route - Analytics and stats for skipped tracks
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
 * Combined route tree that includes all application routes
 * This is exported and used by the router
 */
export const rootTree = RootRoute.addChildren([
  HomeRoute,
  SkippedTracksRoute,
  SettingsRoute,
]);
