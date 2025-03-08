/**
 * Root React Component
 *
 * Entry point for the renderer process that initializes the application UI.
 * Handles routing configuration and global UI components.
 */

import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { syncThemeWithLocal } from "./helpers/theme_helpers";
import { router } from "./routes/router";
import { RouterProvider } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";

/**
 * Primary application component
 *
 * Initializes theme preferences and sets up the application's core UI structure.
 * Integrates routing and global notification systems.
 *
 * @returns React component tree
 */
export default function App() {
  useEffect(() => {
    // Synchronize theme with local storage on mount
    syncThemeWithLocal();
  }, []);

  return (
    <>
      {/* Router provider handles navigation between different pages */}
      <RouterProvider router={router} />

      {/* Global toast notification system for status messages */}
      <Toaster />
    </>
  );
}

// Initialize React application with error handling
try {
  const appElement = document.getElementById("app");

  if (!appElement) {
    console.error("Root element with ID 'app' not found in the DOM");
    // Create the element if it doesn't exist
    const newAppElement = document.createElement("div");
    newAppElement.id = "app";
    document.body.appendChild(newAppElement);
  }

  const root = createRoot(document.getElementById("app")!);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} catch (error) {
  console.error("Fatal error during React initialization:", error);
}
