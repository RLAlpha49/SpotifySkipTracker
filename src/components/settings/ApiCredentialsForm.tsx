import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { HelpCircle, KeyRound, AtSign, Link } from "lucide-react";

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
