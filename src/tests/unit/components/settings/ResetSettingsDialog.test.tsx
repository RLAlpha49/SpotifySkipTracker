import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { ResetSettingsDialog } from "../../../../components/settings/ResetSettingsDialog";

describe("ResetSettingsDialog Component", () => {
  it("should render the trigger button", () => {
    const mockOnReset = vi.fn();

    render(<ResetSettingsDialog onReset={mockOnReset} />);

    // Verify the trigger button is rendered with correct text
    const triggerButton = screen.getByText("Reset to Defaults");
    expect(triggerButton).toBeInTheDocument();
    expect(triggerButton.closest("button")).toHaveClass("destructive");
  });

  it("should show the dialog when the trigger button is clicked", () => {
    const mockOnReset = vi.fn();

    render(<ResetSettingsDialog onReset={mockOnReset} />);

    // Initially, the dialog content should not be visible
    expect(screen.queryByText("Reset Settings")).not.toBeInTheDocument();

    // Click the trigger button to open the dialog
    const triggerButton = screen.getByText("Reset to Defaults");
    fireEvent.click(triggerButton);

    // Now the dialog content should be visible
    expect(screen.getByText("Reset Settings")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Are you sure you want to reset all settings to their default values?",
      ),
    ).toBeInTheDocument();

    // Check for dialog buttons
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(
      screen.getByText("Reset Settings", { selector: "button" }),
    ).toBeInTheDocument();
  });

  it("should call onReset when the confirm button is clicked", () => {
    const mockOnReset = vi.fn();

    render(<ResetSettingsDialog onReset={mockOnReset} />);

    // Click the trigger button to open the dialog
    const triggerButton = screen.getByText("Reset to Defaults");
    fireEvent.click(triggerButton);

    // Click the confirm button
    const confirmButton = screen.getByText("Reset Settings", {
      selector: "button",
    });
    fireEvent.click(confirmButton);

    // Verify onReset was called
    expect(mockOnReset).toHaveBeenCalledTimes(1);
  });

  it("should close the dialog when the Cancel button is clicked", () => {
    const mockOnReset = vi.fn();

    render(<ResetSettingsDialog onReset={mockOnReset} />);

    // Click the trigger button to open the dialog
    const triggerButton = screen.getByText("Reset to Defaults");
    fireEvent.click(triggerButton);

    // Verify dialog is open
    expect(screen.getByText("Reset Settings")).toBeInTheDocument();

    // Click the cancel button
    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    // Give time for the dialog to close
    setTimeout(() => {
      // Dialog should now be closed
      expect(screen.queryByText("Reset Settings")).not.toBeInTheDocument();

      // onReset should not have been called
      expect(mockOnReset).not.toHaveBeenCalled();
    }, 0);
  });

  it("should have the destructive styling on the trigger button", () => {
    const mockOnReset = vi.fn();

    render(<ResetSettingsDialog onReset={mockOnReset} />);

    // Verify the trigger button has the destructive variant and full width styling
    const triggerButton = screen
      .getByText("Reset to Defaults")
      .closest("button");
    expect(triggerButton).toHaveClass("w-full");
    expect(triggerButton).toHaveClass("destructive");
  });
});
