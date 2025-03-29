/**
 * @packageDocumentation
 * @module DragWindowRegion
 * @description Electron Window Titlebar Component
 *
 * Custom window titlebar implementation for Electron applications that provides:
 * - Draggable region for window movement
 * - Window control buttons (minimize, maximize, close)
 * - Optional title display with proper styling
 *
 * This component creates a native-like window experience in frameless Electron windows,
 * allowing users to drag the application and access standard window controls while
 * maintaining a custom look and feel that integrates with the application design.
 *
 * Features:
 * - CSS-based window dragging utilizing Electron's -webkit-app-region
 * - Customizable title content (text or components)
 * - Complete window control buttons with hover states
 * - Accessible button implementations with proper ARIA attributes
 *
 * Implementation details:
 * - Uses helper functions to communicate with Electron's window API
 * - SVG icons for consistent cross-platform appearance
 * - Custom hover states for window controls matching platform conventions
 */
import {
  closeWindow,
  maximizeWindow,
  minimizeWindow,
} from "@/helpers/window_helpers";
import React, { type ReactNode } from "react";

/**
 * Props for the DragWindowRegion component
 *
 * @property title - Optional content to display in the titlebar.
 *                   Can be text or a React component.
 */
interface DragWindowRegionProps {
  title?: ReactNode;
}

/**
 * Custom window titlebar with draggable region and window controls
 *
 * Creates a complete titlebar for Electron applications with:
 * - A draggable area for moving the window
 * - Optional title content in the draggable region
 * - Standard window control buttons (minimize, maximize, close)
 *
 * @param props - Component properties
 * @param props.title - Optional title content to display
 * @returns React component for window titlebar
 * @source
 */
export default function DragWindowRegion({ title }: DragWindowRegionProps) {
  return (
    <div className="flex w-screen items-stretch justify-between">
      <div className="draglayer w-full">
        {title && (
          <div className="flex flex-1 select-none whitespace-nowrap p-2 text-xs text-gray-400">
            {title}
          </div>
        )}
      </div>
      <WindowButtons />
    </div>
  );
}

/**
 * Window Control Buttons Component
 *
 * Renders the standard trio of window control buttons:
 * - Minimize button (horizontal line icon)
 * - Maximize/restore button (square icon)
 * - Close button (X icon)
 *
 * Each button has appropriate hover states and triggers
 * the corresponding window action when clicked.
 *
 * @returns React component with window control buttons
 * @source
 */
function WindowButtons() {
  return (
    <div className="flex">
      <button
        title="Minimize"
        type="button"
        className="p-2 hover:bg-slate-300"
        onClick={minimizeWindow}
      >
        <svg
          aria-hidden="true"
          role="img"
          width="12"
          height="12"
          viewBox="0 0 12 12"
        >
          <rect fill="currentColor" width="10" height="1" x="1" y="6"></rect>
        </svg>
      </button>
      <button
        title="Maximize"
        type="button"
        className="p-2 hover:bg-slate-300"
        onClick={maximizeWindow}
      >
        <svg
          aria-hidden="true"
          role="img"
          width="12"
          height="12"
          viewBox="0 0 12 12"
        >
          <rect
            width="9"
            height="9"
            x="1.5"
            y="1.5"
            fill="none"
            stroke="currentColor"
          ></rect>
        </svg>
      </button>
      <button
        type="button"
        title="Close"
        className="p-2 hover:bg-red-300"
        onClick={closeWindow}
      >
        <svg
          aria-hidden="true"
          role="img"
          width="12"
          height="12"
          viewBox="0 0 12 12"
        >
          <polygon
            fill="currentColor"
            fillRule="evenodd"
            points="11 1.576 6.583 6 11 10.424 10.424 11 6 6.583 1.576 11 1 10.424 5.417 6 1 1.576 1.576 1 6 5.417 10.424 1"
          ></polygon>
        </svg>
      </button>
    </div>
  );
}
