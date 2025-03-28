/**
 * Theme Toggle Component
 *
 * A simple button component that toggles between light and dark themes.
 * Provides a consistent interface for theme switching throughout the application
 * with a moon icon to represent the toggle action.
 *
 * Features:
 * - Minimalistic UI with icon-only button
 * - Uses the application's theme helper for state management
 * - Accessible button implementation with proper ARIA support
 * - Consistent sizing compatible with navigation elements
 *
 * Usage:
 * - Place in headers, settings panels, or anywhere theme switching is needed
 * - Works independently without needing additional props or configuration
 */
import { Button } from "@/components/ui/button";
import { toggleTheme } from "@/helpers/theme_helpers";
import { Moon } from "lucide-react";
import React from "react";

/**
 * Theme toggle button component
 *
 * Renders a button with moon icon that toggles between light and dark themes
 * when clicked. Uses the global theme helper to manage theme state.
 *
 * @returns React component with theme toggle functionality
 */
export default function ToggleTheme() {
  return (
    <Button onClick={toggleTheme} size="icon">
      <Moon size={16} />
    </Button>
  );
}
