/**
 * Main application layout component
 *
 * Provides consistent layout structure throughout the application with:
 * - Window-draggable header with app title and theme toggle
 * - Scrollable main content area
 * - Fixed bottom navigation with route highlighting
 *
 * Uses Electron's app-region CSS properties to enable window dragging
 * in frameless window mode.
 */

import React, { useState, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import ToggleTheme from "@/components/ToggleTheme";
import { HomeIcon, SettingsIcon, SkipForwardIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Props interface for MainLayout component
 *
 * @property children - React nodes to render in the main content area
 */
interface MainLayoutProps {
  children: ReactNode;
}

/**
 * Main layout wrapper for the application
 *
 * @param props - Component properties
 * @param props.children - Content to render in the main area
 * @returns MainLayout component
 */
export default function MainLayout({ children }: MainLayoutProps) {
  // Track the active route for navigation highlighting
  const [activeRoute, setActiveRoute] = useState("/");

  /**
   * Updates active route state when navigation occurs
   *
   * @param route - The route path that was navigated to
   */
  const handleNavigation = (route: string) => {
    setActiveRoute(route);
  };

  // Computed states for active route highlighting
  const isHomeActive = activeRoute === "/";
  const isSkippedTracksActive = activeRoute === "/skipped-tracks";
  const isSettingsActive = activeRoute === "/settings";

  return (
    <div className="flex h-screen flex-col">
      {/* Header - Make draggable with app-region */}
      <header className="app-region-drag border-b">
        <div className="flex w-full items-center justify-between px-6 py-4">
          <h1 className="font-mono text-xl font-bold">Spotify Skip Tracker</h1>
          <div className="app-region-no-drag flex items-center gap-2">
            <ToggleTheme />
          </div>
        </div>
      </header>

      {/* Main Content - scrollable */}
      <ScrollArea className="flex-1 overflow-hidden">{children}</ScrollArea>

      {/* Bottom Navigation - fixed at the bottom */}
      <nav className="bg-background border-t">
        <div className="flex w-full justify-between px-6 py-2">
          <Link
            to="/"
            onClick={() => handleNavigation("/")}
            className={`flex flex-col items-center p-2 ${
              isHomeActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-current={isHomeActive ? "page" : undefined}
          >
            <HomeIcon className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </Link>

          <Link
            to="/skipped-tracks"
            onClick={() => handleNavigation("/skipped-tracks")}
            className={`flex flex-col items-center p-2 ${
              isSkippedTracksActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-current={isSkippedTracksActive ? "page" : undefined}
          >
            <SkipForwardIcon className="h-5 w-5" />
            <span className="text-xs">Skipped</span>
          </Link>

          <Link
            to="/settings"
            onClick={() => handleNavigation("/settings")}
            className={`flex flex-col items-center p-2 ${
              isSettingsActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-current={isSettingsActive ? "page" : undefined}
          >
            <SettingsIcon className="h-5 w-5" />
            <span className="text-xs">Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
