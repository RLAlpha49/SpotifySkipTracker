/**
 * Main Application Layout
 *
 * This component provides the consistent layout structure for the entire application.
 * It includes:
 * - Header with app title and theme toggle
 * - Main content area with scrolling support
 * - Bottom navigation bar with links to main sections
 *
 * The layout uses CSS app-region properties to enable window dragging
 * in the Electron application, and it tracks the active route to highlight
 * the current navigation item.
 */

import React, { useState, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import ToggleTheme from "@/components/ToggleTheme";
import { HomeIcon, SettingsIcon, SkipForwardIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Props for the MainLayout component
 */
interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  // Use state to track which route is active
  const [activeRoute, setActiveRoute] = useState("/");

  // Update activeRoute when a link is clicked
  const handleNavigation = (route: string) => {
    setActiveRoute(route);
  };

  // Check if routes are active based on the activeRoute state
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
      <ScrollArea className="flex-1 overflow-auto">{children}</ScrollArea>

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
