/**
 * @packageDocumentation
 * @module router
 * @description Router Configuration and Initialization Module
 *
 * Creates and configures the TanStack Router instance specialized for Electron environments.
 * This module serves as the central routing configuration for the entire application,
 * establishing how navigation between different views is handled.
 *
 * Key features:
 * - Memory-based history implementation optimal for Electron's non-browser context
 * - TypeScript type augmentation for enhanced type safety and IDE assistance
 * - Integration with route tree definitions from routes.tsx
 * - Export of the configured router instance for application-wide consumption
 *
 * Technical implementation:
 * - Uses memory history instead of browser history since Electron doesn't rely on URL navigation
 * - Registers the router type in the TanStack Router type system for proper typing
 * - Initializes with the root route tree that contains all application routes
 * - Creates a consistent API for navigation throughout the application
 */

import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { rootTree } from "./routes";

/**
 * Type augmentation for TanStack Router
 * Provides type safety and autocompletion for router instance
 */
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Create memory-based history for Electron application
const history = createMemoryHistory({
  initialEntries: ["/"],
});

// Export configured router instance
export const router = createRouter({ routeTree: rootTree, history: history });
