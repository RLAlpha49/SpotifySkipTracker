/**
 * Root Route Component
 *
 * This file defines the root route that serves as the parent for all other routes.
 * It wraps all route content in the MainLayout component, which provides:
 * - Header with application title
 * - Navigation bar
 * - Theme controls
 * - Common layout structure
 *
 * The Outlet component is where child route content will be rendered.
 */

import React from "react";
import MainLayout from "@/layouts/MainLayout";
import { Outlet, createRootRoute } from "@tanstack/react-router";

/**
 * Root route definition, sets the Root component as the base layout
 */
export const RootRoute = createRootRoute({
  component: Root,
});

/**
 * Root component that wraps the main layout around all routes
 */
function Root() {
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}
