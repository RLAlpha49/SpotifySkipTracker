/**
 * Root route component
 *
 * Defines the base route that serves as the parent for all application routes.
 * Wraps all route content in the MainLayout component, which provides:
 * - Application header with title
 * - Navigation between routes
 * - Theme controls
 * - Consistent layout structure
 *
 * Child routes are rendered via TanStack Router's Outlet component.
 */

import React from "react";
import MainLayout from "@/layouts/MainLayout";
import { Outlet, createRootRoute } from "@tanstack/react-router";

/**
 * Root route definition
 * Creates the base route with the Root component as its renderer
 */
export const RootRoute = createRootRoute({
  component: Root,
});

/**
 * Root component
 * Wraps the MainLayout component around all child routes
 *
 * @returns React component with layout and outlet for child routes
 */
function Root() {
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}
