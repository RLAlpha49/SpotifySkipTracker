/**
 * @packageDocumentation
 * @module NoDataMessage
 * @description Empty State Message Component
 *
 * Provides a visually appealing and informative empty state display
 * when statistical data is not yet available for visualization. This
 * component creates a consistent empty state experience across all
 * statistics tabs and visualizations.
 *
 * Visual features:
 * - Soft amber/warning color palette for attention without alarm
 * - Randomly selected chart icon for visual interest
 * - Custom message support for context-specific guidance
 * - Consistent styling with light/dark mode support
 * - Actionable hint for generating future data
 *
 * The component is designed to be both informative and encouraging,
 * helping users understand why data isn't available while motivating
 * them to continue using the application to generate insights.
 */
import { BarChart, Info, LineChart, PieChart } from "lucide-react";
import React from "react";

/**
 * Props for the NoDataMessage component
 *
 * @property message - Custom message explaining why data is unavailable
 *                    or what actions the user can take
 */
interface NoDataMessageProps {
  message: string;
}

/**
 * Empty state display for statistics visualizations
 *
 * Renders a visually distinct card with helpful messaging when
 * statistical data is not yet available for display. Features a
 * randomly selected chart icon and supports custom messaging.
 *
 * Visual characteristics:
 * - Rounded card with amber accent colors
 * - Randomly selected chart icon (bar, line, or pie)
 * - Standard heading with customizable message body
 * - Actionable hint badge at the bottom
 * - Full light/dark mode compatibility
 * - Accessible text contrast and spacing
 *
 * @param props - Component properties
 * @param props.message - Custom message explaining the empty state
 * @returns React component for statistics empty state
 * @source
 */
export function NoDataMessage({ message }: NoDataMessageProps) {
  /**
   * Select a random chart icon for visual variety
   * Different visualization is shown each time the component renders
   */
  const icons = [
    <BarChart key="bar" className="h-5 w-5 text-amber-500" />,
    <LineChart key="line" className="h-5 w-5 text-amber-500" />,
    <PieChart key="pie" className="h-5 w-5 text-amber-500" />,
  ];

  const randomIcon = icons[Math.floor(Math.random() * icons.length)];

  return (
    <div
      data-testid="no-data-container"
      className="flex flex-col items-center justify-center rounded-lg border border-amber-200 bg-amber-50/50 px-6 py-8 text-center shadow-sm transition-all duration-200 dark:border-amber-800/30 dark:bg-amber-950/20"
    >
      <div
        data-testid="icon-container"
        className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30"
      >
        {randomIcon}
      </div>
      <div className="max-w-md space-y-2">
        <h3 className="text-lg font-medium text-amber-800 dark:text-amber-400">
          No Data Available
        </h3>
        <p className="text-amber-700/90 dark:text-amber-400/90">{message}</p>
        <div className="pt-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            <Info className="h-3.5 w-3.5" />
            Keep listening to generate insights
          </div>
        </div>
      </div>
    </div>
  );
}
