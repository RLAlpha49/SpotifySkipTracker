import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LucideLogIn,
  LogOut,
  CheckCircle,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
    <Card className="border-muted-foreground/20 h-full shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-xl font-semibold">
          <UserCheck className="text-primary mr-2 h-5 w-5" />
          Authentication
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {isAuthenticated ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="font-medium text-green-600 dark:text-green-400">
                  Connected to Spotify
                </span>
              </div>
              <Badge
                variant="outline"
                className="border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
              >
                Authenticated
              </Badge>
            </div>
            <Button
              variant="outline"
              onClick={onLogout}
              className="mt-2 w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <span className="font-medium text-red-600 dark:text-red-400">
                  Not connected to Spotify
                </span>
              </div>
              <Badge
                variant="outline"
                className="border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
              >
                Not Authenticated
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {needsReauthentication
                ? "You've logged out. Click Login to authenticate with Spotify."
                : "Connect to Spotify to use playback monitoring and controls."}
            </p>
            <Button
              onClick={onLogin}
              className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
            >
              <LucideLogIn className="mr-2 h-4 w-4" />
              Login with Spotify
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
