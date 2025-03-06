/**
 * Theme Management Helpers
 *
 * This module provides functions for managing the application's theme (dark/light mode).
 * It handles user preferences, system theme detection, and synchronization between
 * localStorage and the application state.
 *
 * The theme system supports three modes:
 * - "dark": Forces dark mode regardless of system settings
 * - "light": Forces light mode regardless of system settings
 * - "system": Follows the user's operating system preference
 */

import { ThemeMode } from "@/types/theme-mode";

// Key used for storing theme preference in localStorage
const THEME_KEY = "theme";

/**
 * Interface representing the user's theme preferences
 */
export interface ThemePreferences {
  system: ThemeMode; // Current system theme mode
  local: ThemeMode | null; // User's stored preference (or null if not set)
}

/**
 * Get the current theme settings from both the system and localStorage
 *
 * @returns Object containing both system theme and local preference
 */
export async function getCurrentTheme(): Promise<ThemePreferences> {
  const currentTheme = await window.themeMode.current();
  const localTheme = localStorage.getItem(THEME_KEY) as ThemeMode | null;

  return {
    system: currentTheme,
    local: localTheme,
  };
}

/**
 * Set the application theme to a specific mode
 * Updates both the system appearance and saves the preference to localStorage
 *
 * @param newTheme - The theme mode to set ("dark", "light", or "system")
 */
export async function setTheme(newTheme: ThemeMode) {
  switch (newTheme) {
    case "dark":
      await window.themeMode.dark();
      updateDocumentTheme(true);
      break;
    case "light":
      await window.themeMode.light();
      updateDocumentTheme(false);
      break;
    case "system": {
      const isDarkMode = await window.themeMode.system();
      updateDocumentTheme(isDarkMode);
      break;
    }
  }

  localStorage.setItem(THEME_KEY, newTheme);
}

/**
 * Toggle between light and dark themes
 * If currently in dark mode, switches to light mode and vice versa
 * Also updates the stored preference in localStorage
 */
export async function toggleTheme() {
  const isDarkMode = await window.themeMode.toggle();
  const newTheme = isDarkMode ? "dark" : "light";

  updateDocumentTheme(isDarkMode);
  localStorage.setItem(THEME_KEY, newTheme);
}

/**
 * Synchronize the application theme with localStorage preference
 * Called at application startup to restore the user's preference
 * If no preference is stored, defaults to system theme
 */
export async function syncThemeWithLocal() {
  const { local } = await getCurrentTheme();
  if (!local) {
    setTheme("system");
    return;
  }

  await setTheme(local);
}

/**
 * Update the document theme by adding or removing the 'dark' class
 * This allows CSS to apply the correct theme styling
 *
 * @param isDarkMode - Whether dark mode should be active
 */
function updateDocumentTheme(isDarkMode: boolean) {
  if (!isDarkMode) {
    document.documentElement.classList.remove("dark");
  } else {
    document.documentElement.classList.add("dark");
  }
}
