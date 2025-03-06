import React from "react";
import { Link, Outlet, useRouter } from "@tanstack/react-router";
import ToggleTheme from "@/components/ToggleTheme";
import { HomeIcon, SettingsIcon, SkipForwardIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function MainLayout() {
  const router = useRouter();

  const isActive = (path: string) => {
    return router.state.location.pathname === path;
  };

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
      <ScrollArea className="flex-1 overflow-auto">
        <Outlet />
      </ScrollArea>

      {/* Bottom Navigation - fixed at the bottom */}
      <nav className="bg-background border-t">
        <div className="flex w-full justify-between px-6 py-2">
          <Link
            to="/"
            className={`flex flex-col items-center p-2 ${
              isActive("/")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-current={isActive("/") ? "page" : undefined}
          >
            <HomeIcon className="h-5 w-5" />
            <span className="mt-1 text-xs">Home</span>
          </Link>

          <Link
            to="/skipped-tracks"
            className={`flex flex-col items-center p-2 ${
              isActive("/skipped-tracks")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-current={isActive("/skipped-tracks") ? "page" : undefined}
          >
            <SkipForwardIcon className="h-5 w-5" />
            <span className="mt-1 text-xs">Skipped Tracks</span>
          </Link>

          <Link
            to="/settings"
            className={`flex flex-col items-center p-2 ${
              isActive("/settings")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-current={isActive("/settings") ? "page" : undefined}
          >
            <SettingsIcon className="h-5 w-5" />
            <span className="mt-1 text-xs">Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
