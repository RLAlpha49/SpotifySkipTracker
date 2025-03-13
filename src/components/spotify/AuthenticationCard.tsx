import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LucideLogIn } from "lucide-react";

interface AuthenticationCardProps {
  isAuthenticated: boolean;
  needsReauthentication: boolean;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
}

export function AuthenticationCard({
  isAuthenticated,
  needsReauthentication,
  onLogin,
  onLogout,
}: AuthenticationCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="mb-4 text-lg font-semibold">Authentication</h2>
        {isAuthenticated ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-green-600 dark:text-green-400">
                Connected to Spotify
              </span>
              <Button variant="outline" onClick={onLogout}>
                Logout
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-red-600 dark:text-red-400">
                Not connected to Spotify
              </span>
              <Button variant="outline" onClick={onLogin}>
                <LucideLogIn className="mr-2 h-4 w-4" />
                Login
              </Button>
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              {needsReauthentication
                ? "You've logged out. Click Login to authenticate with Spotify."
                : "Connect to Spotify to use playback monitoring and controls."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
