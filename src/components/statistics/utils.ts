/**
 * Statistics Data Visualization Utilities
 *
 * Collection of specialized formatting and conversion functions for transforming
 * raw statistics data into human-readable formats for display in charts,
 * tables, and summary cards throughout the statistics module.
 *
 * These utilities ensure consistent data presentation across all statistics
 * views and provide standard formatting for time values, percentages, and
 * temporal data that appears in multiple visualization contexts.
 *
 * Core capabilities:
 * - Time duration formatting with appropriate units
 * - Percentage formatting with consistent decimal precision
 * - Day and hour naming/labeling for temporal analysis
 * - Value normalization for chart display
 */

/**
 * Converts milliseconds to human-readable duration string
 *
 * Formats raw millisecond durations into concise, human-friendly
 * strings with appropriate units based on magnitude. Automatically
 * selects between hour+minute or minute-only format based on duration.
 *
 * Examples:
 * - 9,540,000 ms → "2h 39m"
 * - 180,000 ms → "3m"
 * - 0 ms → "0m"
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string with appropriate units
 */
export const formatTime = (ms: number) => {
  if (!ms) return "0m";

  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else {
    return `${minutes}m`;
  }
};

/**
 * Formats decimal ratios as percentage strings
 *
 * Converts raw decimal values (0-1) to percentage strings with
 * consistent decimal precision for display in statistics views.
 * Maintains uniform presentation across all percentage metrics.
 *
 * Examples:
 * - 0.756 → "75.6%"
 * - 0.25 → "25.0%"
 * - 1.0 → "100.0%"
 *
 * @param value - Decimal value between 0 and 1
 * @returns Formatted percentage string with one decimal place
 */
export const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(1)}%`;
};

/**
 * Converts numerical day index to day name
 *
 * Transforms day indices (0-6) into human-readable day names
 * for temporal data visualization and axis labeling. Uses
 * standard day order with Sunday as index 0.
 *
 * @param day - Day index (0=Sunday, 1=Monday, etc.)
 * @returns Full day name as a string
 */
export const getDayName = (day: number) => {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[day];
};

/**
 * Formats 24-hour time value to 12-hour format with AM/PM
 *
 * Converts raw hour values (0-23) to user-friendly time labels
 * for time-based chart axes and temporal data display. Handles
 * edge cases like midnight and noon with proper formatting.
 *
 * Supports cyclic hour values and normalizes any hour value
 * to the correct 0-23 range with modulo arithmetic.
 *
 * Examples:
 * - 0 → "12 AM" (midnight)
 * - 12 → "12 PM" (noon)
 * - 15 → "3 PM"
 * - 23 → "11 PM"
 *
 * @param hour - Hour in 24-hour format (normalized to 0-23 range)
 * @returns Formatted time label in 12-hour format with AM/PM
 */
export function getHourLabel(hour: number): string {
  // Handle negative hours and hours > 23 properly by applying modulo 24
  // JavaScript modulo doesn't work with negative numbers the way we need
  // so we add 24 first for negative numbers
  const normalizedHour = ((hour % 24) + 24) % 24;
  const period = normalizedHour >= 12 ? "PM" : "AM";
  const displayHour = normalizedHour % 12 || 12; // Convert 0 to 12 for 12 AM
  return `${displayHour} ${period}`;
}
