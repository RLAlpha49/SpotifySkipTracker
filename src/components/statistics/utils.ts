/**
 * Statistics utility functions
 *
 * Common helper functions used across statistics components
 */

/**
 * Formats milliseconds into a human-readable time format
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
 * Formats a decimal value to percentage with 1 decimal place
 */
export const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(1)}%`;
};

/**
 * Gets the name of the day from numerical index (0-6)
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
 * Formats an hour number into a readable time label
 *
 * @param hour - Hour in 24-hour format (0-23)
 * @returns Time label in 12-hour format (e.g., "12 AM", "1 PM")
 */
export function getHourLabel(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12; // Convert 0 to 12 for 12 AM
  return `${displayHour} ${period}`;
}
