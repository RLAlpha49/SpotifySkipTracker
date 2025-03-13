import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

// Import the schema from a shared location for consistency
import { settingsFormSchema } from "./settingsFormSchema";

interface ApiCredentialsFormProps {
  form: UseFormReturn<z.infer<typeof settingsFormSchema>>;
  setSettingsChanged: (changed: boolean) => void;
}

export function ApiCredentialsForm({
  form,
  setSettingsChanged,
}: ApiCredentialsFormProps) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold">Spotify API Credentials</h2>
      <p className="text-muted-foreground mb-4 text-sm">
        Enter your Spotify Developer credentials. You can get these from the{" "}
        <a
          href="https://developer.spotify.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          Spotify Developer Dashboard
        </a>
        .
      </p>
      <Card>
        <CardContent className="p-6">
          <div className="mb-4">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-1">
                    <FormLabel>Client ID</FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="text-muted-foreground h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            The public identifier for your Spotify application.
                            This is required to authenticate with the Spotify
                            API. You can find it in your Spotify Developer
                            Dashboard.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <FormControl>
                    <Input
                      placeholder="Spotify Client ID"
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
          </div>

          <div className="mb-4">
            <FormField
              control={form.control}
              name="clientSecret"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-1">
                    <FormLabel>Client Secret</FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="text-muted-foreground h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>
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
          </div>

          <div>
            <FormField
              control={form.control}
              name="redirectUri"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-1">
                    <FormLabel>Redirect URI</FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="text-muted-foreground h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
