/**
 * Main React Application Component
 *
 * This is the entry point for the React/renderer portion of the Electron application.
 * It sets up the router and global UI components like the toast notification system.
 */

import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { syncThemeWithLocal } from "./helpers/theme_helpers";
import { router } from "./routes/router";
import { RouterProvider } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";

/**
 * Main App component that wraps the router and global UI elements
 *
 * On mount, it synchronizes the theme with local storage preferences
 * to maintain consistent light/dark mode across application restarts
 */
export default function App() {
  useEffect(() => {
    // Sync theme (dark/light mode) with local storage on component mount
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

// Create React root and render the application with StrictMode for better development experience
const root = createRoot(document.getElementById("app")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
