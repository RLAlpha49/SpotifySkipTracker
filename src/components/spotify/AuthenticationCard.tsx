/**
 * @packageDocumentation
 * @module AuthenticationCard
 * @description Spotify Authentication Management Component
 *
 * Provides a user interface for handling Spotify API authentication status
 * and actions. This card visually communicates the current authentication
 * state and offers appropriate login/logout functionality.
 *
 * Features:
 * - Visual status indicator with color-coding and icons
 * - Context-aware messaging based on authentication state
 * - Authentication badge for quick status recognition
 * - Login button with Spotify branding for OAuth flow initiation
 * - Logout functionality for session termination
 * - Responsive design with consistent styling
 *
 * The component adapts its display and messaging based on whether
 * the user is currently authenticated or requires re-authentication,
 * providing appropriate guidance and actions for each state.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  CheckCircle,
  LogOut,
  LucideLogIn,
  UserCheck,
} from "lucide-react";
import React from "react";

/**
 * Props for the AuthenticationCard component
 *
 * @property isAuthenticated - Whether the user is currently authenticated with Spotify
 * @property needsReauthentication - Whether the user needs to reconnect after logout
 * @property onLogin - Handler function for initiating Spotify OAuth flow
 * @property onLogout - Handler function for terminating the Spotify session
 */
interface AuthenticationCardProps {
  isAuthenticated: boolean;
  needsReauthentication: boolean;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
}

/**
 * Spotify authentication status and control card
 *
 * Renders a card component that displays the current authentication
 * status with Spotify and provides appropriate action buttons. The
 * component has two main display states:
 *
 * 1. Authenticated: Shows connected status with green indicators and logout option
 * 2. Unauthenticated: Shows disconnected status with red indicators and login button
 *
 * The component also adapts its messaging based on whether the user has
 * previously logged out (needs reauthentication) or is logging in for
 * the first time.
 *
 * @param props - Component properties
 * @param props.isAuthenticated - Current authentication state
 * @param props.needsReauthentication - Whether user previously logged out
 * @param props.onLogin - Function to handle login request
 * @param props.onLogout - Function to handle logout request
 * @returns React component for authentication management
 * @source
 */
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
