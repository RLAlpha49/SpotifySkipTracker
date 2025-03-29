/**
 * @packageDocumentation
 * @module __root
 * @description Root Route Definition and Base Layout Container
 *
 * Establishes the foundation of the application's routing hierarchy by providing:
 * - The parent route from which all application routes inherit
 * - The base layout structure that wraps all rendered views
 * - Integration with TanStack Router's outlet rendering system
 *
 * This module creates the consistent structural frame around all application content
 * by ensuring the MainLayout component encapsulates every route's output. The layout
 * provides the application header, navigation controls, and theme management that
 * remain consistent regardless of which route is active.
 *
 * Integration points:
 * - Imported by routes.tsx to serve as the parent for all route definitions
 * - Uses MainLayout from layouts directory to maintain UI consistency
 * - Leverages TanStack Router's Outlet component for dynamic content rendering
 * - Exports the root route for the router configuration
 */

import MainLayout from "@/layouts/MainLayout";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import React from "react";

/**
 * Root Route Definition
 *
 * Creates the base route configuration that serves as the parent
 * for all other routes in the application. Sets the Root component
 * as the renderer for this route, establishing the application's
 * foundational layout structure.
 *
 * @returns Root route configuration object
 */
export const RootRoute = createRootRoute({
  component: Root,
});

/**
 * Root Layout Component
 *
 * Wraps all route content in the MainLayout component to ensure
 * consistent application structure across all views. Renders the
 * current route's component through the Outlet placeholder.
 *
 * The MainLayout provides:
 * - Header with application title and branding
 * - Theme mode controls (light/dark/system)
 * - Bottom navigation bar with route links
 * - Consistent padding and spacing
 *
 * @returns React component tree with layout wrapper and dynamic outlet
 * @source
 */
function Root() {
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}
