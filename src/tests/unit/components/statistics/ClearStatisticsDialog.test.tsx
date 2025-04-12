import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { ClearStatisticsDialog } from "../../../../components/statistics/ClearStatisticsDialog";

describe("ClearStatisticsDialog Component", () => {
  it("should render the dialog when open is true", () => {
    const mockOnOpenChange = vi.fn();
    const mockOnClear = vi.fn();

    render(
      <ClearStatisticsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onClear={mockOnClear}
        clearing={false}
      />,
    );

    // Verify the title and content are rendered
    expect(screen.getByText("Clear Statistics")).toBeInTheDocument();

    // Use flexible text matcher for text that is split across elements
    expect(
      screen.getByText((content) => content.includes("PERMANENT")),
    ).toBeInTheDocument();

    expect(
      screen.getByText((content) =>
        content.includes(
          "All of the following data will be permanently deleted",
        ),
      ),
    ).toBeInTheDocument();

    // Verify warning items are shown
    expect(
      screen.getByText("All listening history and statistics"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Artist listening patterns and skip rates"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Session data and device usage information"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Daily, weekly, and monthly metrics"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Time-based analytics and trends"),
    ).toBeInTheDocument();

    // Verify the skipped tracks notice is shown
    expect(
      screen.getByText((content) =>
        content.includes(
          "first clear your skipped tracks in the Skips tab, then clear statistics",
        ),
      ),
    ).toBeInTheDocument();

    // Verify the buttons are present
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(
      screen.getByText("I Understand, Clear All Data"),
    ).toBeInTheDocument();
  });

  it("should call onClear when the confirm button is clicked", () => {
    const mockOnOpenChange = vi.fn();
    const mockOnClear = vi.fn();

    render(
      <ClearStatisticsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onClear={mockOnClear}
        clearing={false}
      />,
    );

    // Click the confirmation button
    const confirmButton = screen.getByText("I Understand, Clear All Data");
    fireEvent.click(confirmButton);

    // Verify onClear was called
    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });

  it("should call onOpenChange when the cancel button is clicked", () => {
    const mockOnOpenChange = vi.fn();
    const mockOnClear = vi.fn();

    render(
      <ClearStatisticsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onClear={mockOnClear}
        clearing={false}
      />,
    );

    // Click the cancel button
    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    // The component likely passes values internally to AlertDialog which
    // then calls onOpenChange with false, but since we're mocking the underlying
    // AlertDialog we just verify it was called
    expect(mockOnOpenChange).toHaveBeenCalled();
  });

  it("should show loading state when clearing is true", () => {
    const mockOnOpenChange = vi.fn();
    const mockOnClear = vi.fn();

    render(
      <ClearStatisticsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onClear={mockOnClear}
        clearing={true}
      />,
    );

    // Verify the loading text is displayed
    expect(screen.getByText("Clearing...")).toBeInTheDocument();

    // The confirmation button should be disabled during clearing
    const confirmButton = screen.getByText("Clearing...");
    expect(confirmButton).toHaveAttribute("disabled");

    // The cancel button should also be disabled during clearing
    const cancelButton = screen.getByText("Cancel");
    expect(cancelButton).toHaveAttribute("disabled");
  });
});
