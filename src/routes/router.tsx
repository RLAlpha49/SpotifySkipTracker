/**
 * Application router configuration
 *
 * Configures TanStack Router with memory history mode for Electron environment.
 * Since Electron doesn't use browser URLs, a memory-based router is more appropriate
 * than a browser history-based one.
 *
 * The router connects with route definitions from routes.tsx and provides
 * TypeScript type safety through the Register interface.
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
