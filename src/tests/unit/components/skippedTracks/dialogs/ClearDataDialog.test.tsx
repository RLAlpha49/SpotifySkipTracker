import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import ClearDataDialog from "../../../../../components/skippedTracks/dialogs/ClearDataDialog";

describe("ClearDataDialog Component", () => {
  it("should render when open is true", () => {
    const mockOnOpenChange = vi.fn();
    const mockOnConfirm = vi.fn();

    render(
      <ClearDataDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />,
    );

    // Verify title and content are rendered
    expect(screen.getByText("Clear Skip Statistics")).toBeInTheDocument();
    expect(
      screen.getByText("All Statistics Will Be Cleared"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/This will permanently delete all skipped tracks data/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This action cannot be undone."),
    ).toBeInTheDocument();

    // Verify buttons are present
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Clear All Skip Data")).toBeInTheDocument();
  });

  it("should not render when open is false", () => {
    const mockOnOpenChange = vi.fn();
    const mockOnConfirm = vi.fn();

    render(
      <ClearDataDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />,
    );

    // Verify dialog content is not rendered
    expect(screen.queryByText("Clear Skip Statistics")).not.toBeInTheDocument();
  });

  it("should call onConfirm when the confirm button is clicked", async () => {
    const mockOnOpenChange = vi.fn();
    const mockOnConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <ClearDataDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />,
    );

    // Click the confirmation button
    const confirmButton = screen.getByText("Clear All Skip Data");
    fireEvent.click(confirmButton);

    // Verify onConfirm was called
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it("should call onOpenChange when the cancel button is clicked", () => {
    const mockOnOpenChange = vi.fn();
    const mockOnConfirm = vi.fn();

    render(
      <ClearDataDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />,
    );

    // Click the cancel button
    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    // The AlertDialog's implementation should call onOpenChange(false)
    // We can't directly test this due to the inner workings of the AlertDialog
    // but we can verify it was called at least once
    expect(mockOnOpenChange).toHaveBeenCalled();
  });

  it("should have the correct dialog styling classes", () => {
    const mockOnOpenChange = vi.fn();
    const mockOnConfirm = vi.fn();

    render(
      <ClearDataDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />,
    );

    // Check for amber-related styles that are specific to this warning dialog
    const dialogContent = screen.getByRole("alertdialog");
    expect(dialogContent).toHaveClass("border-amber-200");

    // Check for color styling on the action button
    const actionButton = screen.getByText("Clear All Skip Data");
    expect(actionButton).toHaveClass("bg-amber-600");
  });
});
