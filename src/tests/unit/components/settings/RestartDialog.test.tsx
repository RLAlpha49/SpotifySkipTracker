import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { RestartDialog } from "../../../../components/settings/RestartDialog";

describe("RestartDialog Component", () => {
  it("should render when showRestartDialog is true", () => {
    const mockSetShowRestartDialog = vi.fn();
    const mockOnRestart = vi.fn();

    render(
      <RestartDialog
        showRestartDialog={true}
        setShowRestartDialog={mockSetShowRestartDialog}
        onRestart={mockOnRestart}
      />,
    );

    // Verify title and content are rendered
    expect(screen.getByText("Restart Required")).toBeInTheDocument();
    expect(
      screen.getByText(
        /The changes you made require an application restart to take effect/i,
      ),
    ).toBeInTheDocument();

    // Verify buttons are present
    expect(screen.getByText("Later")).toBeInTheDocument();
    expect(screen.getByText("Restart Now")).toBeInTheDocument();
  });

  it("should not render when showRestartDialog is false", () => {
    const mockSetShowRestartDialog = vi.fn();
    const mockOnRestart = vi.fn();

    render(
      <RestartDialog
        showRestartDialog={false}
        setShowRestartDialog={mockSetShowRestartDialog}
        onRestart={mockOnRestart}
      />,
    );

    // Verify dialog content is not rendered
    expect(screen.queryByText("Restart Required")).not.toBeInTheDocument();
  });

  it("should call onRestart when the Restart Now button is clicked", async () => {
    const mockSetShowRestartDialog = vi.fn();
    const mockOnRestart = vi.fn().mockResolvedValue(undefined);

    render(
      <RestartDialog
        showRestartDialog={true}
        setShowRestartDialog={mockSetShowRestartDialog}
        onRestart={mockOnRestart}
      />,
    );

    // Click the restart button
    const restartButton = screen.getByText("Restart Now");
    fireEvent.click(restartButton);

    // Verify onRestart was called
    expect(mockOnRestart).toHaveBeenCalledTimes(1);
  });

  it("should call setShowRestartDialog when the Later button is clicked", () => {
    const mockSetShowRestartDialog = vi.fn();
    const mockOnRestart = vi.fn();

    render(
      <RestartDialog
        showRestartDialog={true}
        setShowRestartDialog={mockSetShowRestartDialog}
        onRestart={mockOnRestart}
      />,
    );

    // Click the Later button
    const laterButton = screen.getByText("Later");
    fireEvent.click(laterButton);

    // The AlertDialog's implementation should call setShowRestartDialog(false)
    // We can't directly test the value but we can verify it was called
    expect(mockSetShowRestartDialog).toHaveBeenCalled();
  });

  it("should have the correct button styling", () => {
    const mockSetShowRestartDialog = vi.fn();
    const mockOnRestart = vi.fn();

    render(
      <RestartDialog
        showRestartDialog={true}
        setShowRestartDialog={mockSetShowRestartDialog}
        onRestart={mockOnRestart}
      />,
    );

    // Check for primary button styling
    const restartButton = screen.getByText("Restart Now");
    expect(restartButton).toHaveClass("bg-primary");
    expect(restartButton).toHaveClass("hover:bg-primary/90");
  });
});
