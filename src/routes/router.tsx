/**
 * Application Router Configuration
 *
 * This file sets up the TanStack Router for the application,
 * creating a memory history (rather than browser history) since this is
 * an Electron application and doesn't use browser URLs.
 *
 * The router connects to the route definitions in routes.tsx and
 * provides type safety through the Register interface.
 */

import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { rootTree } from "./routes";

// Type augmentation for TanStack Router to provide type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Create in-memory history for Electron app (doesn't use browser URLs)
const history = createMemoryHistory({
  initialEntries: ["/"],
});

// Export the configured router instance
export const router = createRouter({ routeTree: rootTree, history: history });
