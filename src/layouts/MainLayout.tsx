import React from "react";
import { Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import ToggleTheme from "@/components/ToggleTheme";
import {
  HomeIcon,
  SettingsIcon,
  SkipForwardIcon,
  LogOutIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
export default function MainLayout() {
  const router = useRouter();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    return router.state.location.pathname === path;
  };

  // This would be replaced with actual state management
  const isAuthenticated = true;

  const handleLogout = () => {
    // This would have the actual logout logic
    console.log("Logging out");
    navigate({ to: "/" });
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header - Make draggable with app-region */}
      <header className="app-region-drag border-b">
        <div className="container mx-auto flex items-center justify-between p-4">
          <h1 className="font-mono text-xl font-bold">Spotify Skip Tracker</h1>
          <div className="app-region-no-drag flex items-center gap-2">
            <ToggleTheme />
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOutIcon className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - scrollable */}
      <ScrollArea className="flex-1 overflow-auto">
        <Outlet />
      </ScrollArea>

      {/* Bottom Navigation - fixed at the bottom */}
      <nav className="bg-background border-t">
        <div className="container mx-auto px-4">
          <div className="flex justify-between py-2">
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
        </div>
      </nav>
    </div>
  );
}
