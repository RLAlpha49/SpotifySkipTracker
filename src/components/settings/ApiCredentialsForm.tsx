/**
 * Spotify API Credentials Configuration Component
 *
 * Provides a user interface for managing Spotify Developer API authentication
 * credentials required for application functionality. This component collects
 * and validates the essential credentials needed to establish connectivity
 * with the Spotify Web API.
 *
 * Features:
 * - Input fields for Spotify Client ID, Client Secret, and Redirect URI
 * - Field-specific validation with error messaging
 * - Contextual help tooltips explaining each credential's purpose
 * - Direct link to Spotify Developer Dashboard for credential creation
 * - Real-time change tracking to prompt save actions
 *
 * This component handles the most critical configuration aspect of the application,
 * as valid API credentials are required for all Spotify data access functionality.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AtSign, HelpCircle, KeyRound, Link } from "lucide-react";
import React from "react";
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";

// Import the schema from a shared location for consistency
import { settingsFormSchema } from "./settingsFormSchema";

/**
 * Props for the ApiCredentialsForm component
 *
 * @property form - React Hook Form instance with Zod schema typing
 * @property setSettingsChanged - Callback to notify parent component of changes
 */
interface ApiCredentialsFormProps {
  form: UseFormReturn<z.infer<typeof settingsFormSchema>>;
  setSettingsChanged: (changed: boolean) => void;
}

/**
 * Spotify API credentials configuration form
 *
 * Renders a card-based form containing input fields for the three essential
 * Spotify API credentials required for application authentication. Includes
 * descriptive labels, tooltips, and validation.
 *
 * The component tracks changes and notifies the parent component when settings
 * are modified to enable proper save state management.
 *
 * @param props - Component properties
 * @param props.form - React Hook Form instance for form state management
 * @param props.setSettingsChanged - Function to notify parent of form changes
 * @returns React component for managing Spotify API credentials
 */
export function ApiCredentialsForm({
  form,
  setSettingsChanged,
}: ApiCredentialsFormProps) {
  return (
    <div>
      <CardHeader className="px-0 pt-0">
        <CardTitle className="mb-1 flex items-center text-xl font-semibold">
          <KeyRound className="text-primary mr-2 h-5 w-5" />
          Spotify API Credentials
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Enter your Spotify Developer credentials. You can get these from the{" "}
          <a
            href="https://developer.spotify.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary decoration-primary font-medium underline-offset-4 transition-all hover:underline"
          >
            Spotify Developer Dashboard
          </a>
          .
        </p>
      </CardHeader>

      <Card className="border-muted-foreground/20 shadow-sm">
        <CardContent className="space-y-6 p-6">
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <div className="mb-1.5 flex items-center space-x-2">
                  <FormLabel className="flex items-center text-base font-medium">
                    <AtSign className="text-primary-muted mr-1.5 h-4 w-4" />
                    Client ID
                  </FormLabel>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="text-muted-foreground h-4 w-4" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-md">
                        <p>
                          The public identifier for your Spotify application.
                          This is required to authenticate with the Spotify API.
                          You can find it in your Spotify Developer Dashboard.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <FormControl>
                  <Input
                    placeholder="Spotify Client ID"
                    className="font-mono text-sm"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      setSettingsChanged(true);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Your Spotify application Client ID
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clientSecret"
            render={({ field }) => (
              <FormItem>
                <div className="mb-1.5 flex items-center space-x-2">
                  <FormLabel className="flex items-center text-base font-medium">
                    <KeyRound className="text-primary-muted mr-1.5 h-4 w-4" />
                    Client Secret
                  </FormLabel>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="text-muted-foreground h-4 w-4" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>
                          The private secret key for your Spotify application.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Spotify Client Secret"
                    className="font-mono text-sm"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      setSettingsChanged(true);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Your Spotify application Client Secret
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="redirectUri"
            render={({ field }) => (
              <FormItem>
                <div className="mb-1.5 flex items-center space-x-2">
                  <FormLabel className="flex items-center text-base font-medium">
                    <Link className="text-primary-muted mr-1.5 h-4 w-4" />
                    Redirect URI
                  </FormLabel>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="text-muted-foreground h-4 w-4" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-md">
                        <p>
                          The URL where Spotify will redirect after
                          authentication. This must exactly match one of the
                          Redirect URIs configured in your Spotify Developer
                          Dashboard.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <FormControl>
                  <Input
                    placeholder="http://localhost:8888/callback"
                    className="font-mono text-sm"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      setSettingsChanged(true);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  The redirect URI registered in your Spotify application
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
