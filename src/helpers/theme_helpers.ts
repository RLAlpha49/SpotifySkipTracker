/**
 * Theme management module
 *
 * Provides functionality for managing application themes (dark/light mode).
 * Handles user preferences, system theme detection, and synchronization
 * between localStorage and application state.
 *
 * Supports three theme modes:
 * - "dark": Forces dark mode regardless of system settings
 * - "light": Forces light mode regardless of system settings
 * - "system": Follows the operating system preference
 */

import { ThemeMode } from "@/types/theme-mode";

// Storage key for theme preference in localStorage
const THEME_KEY = "theme";

/**
 * Theme preferences interface
 *
 * @property system - Current detected system theme mode
 * @property local - User's stored theme preference (null if not set)
 */
export interface ThemePreferences {
  system: ThemeMode;
  local: ThemeMode | null;
}

/**
 * Gets current theme settings from both system and localStorage
 *
 * @returns Promise resolving to object with system theme and local preference
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
 * Sets application theme to specified mode
 * Updates both the system appearance and saves preference to localStorage
 *
 * @param newTheme - The theme mode to set ("dark", "light", or "system")
 * @returns Promise that resolves when theme is set
 */
export async function setTheme(newTheme: ThemeMode): Promise<void> {
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
 * Toggles between light and dark themes
 * If currently in dark mode, switches to light mode and vice versa
 * Updates stored preference in localStorage
 *
 * @returns Promise resolving when theme toggle is complete
 */
export async function toggleTheme(): Promise<void> {
  const isDarkMode = await window.themeMode.toggle();
  const newTheme = isDarkMode ? "dark" : "light";

  updateDocumentTheme(isDarkMode);
  localStorage.setItem(THEME_KEY, newTheme);
}

/**
 * Synchronizes application theme with localStorage preference
 * Called at application startup to restore user preference
 * If no preference is stored, defaults to system theme
 *
 * @returns Promise resolving when theme synchronization is complete
 */
export async function syncThemeWithLocal(): Promise<void> {
  const { local } = await getCurrentTheme();
  if (!local) {
    setTheme("system");
    return;
  }

  await setTheme(local);
}

/**
 * Updates document theme by manipulating the 'dark' class
 * Enables CSS to apply the correct theme styling
 *
 * @param isDarkMode - Whether dark mode should be active
 */
function updateDocumentTheme(isDarkMode: boolean): void {
  if (!isDarkMode) {
    document.documentElement.classList.remove("dark");
  } else {
    document.documentElement.classList.add("dark");
  }
}
