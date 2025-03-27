import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { ApplicationSettingsForm } from "../../../../components/settings/ApplicationSettingsForm";

// Mock the ToggleTheme component
vi.mock("../../../../components/ToggleTheme", () => ({
  default: () => <div data-testid="toggle-theme">Toggle Theme Component</div>,
}));

// Setup mock functions for form and onChange
const mockControl = {
  control: {},
  formState: { errors: {} },
};

const mockSetSettingsChanged = vi.fn();

describe("ApplicationSettingsForm Component", () => {
  const setupTest = () => {
    return render(
      <ApplicationSettingsForm
        form={mockControl as any}
        setSettingsChanged={mockSetSettingsChanged}
      />,
    );
  };

  beforeEach(() => {
    mockSetSettingsChanged.mockReset();
  });

  it("renders form with correct headings and sections", () => {
    setupTest();

    // Check for heading
    expect(screen.getByText("Application Settings")).toBeInTheDocument();
  });

  it("renders polling interval field", () => {
    setupTest();

    // Check for polling interval field
    expect(screen.getByLabelText(/polling interval/i)).toBeInTheDocument();
  });

  it("calls setSettingsChanged when Auto-Start Monitoring is toggled", () => {
    setupTest();

    // Find switch by its label
    const autoStartLabel = screen.getByText(/auto-start monitoring/i);
    expect(autoStartLabel).toBeInTheDocument();

    // Get the switch and toggle it
    const autoStartSwitch = autoStartLabel
      .closest("div")
      ?.querySelector("button");
    if (autoStartSwitch) {
      fireEvent.click(autoStartSwitch);
      expect(mockSetSettingsChanged).toHaveBeenCalledWith(true);
    }
  });

  it("calls setSettingsChanged when polling interval is changed", () => {
    setupTest();

    // Find polling interval input
    const pollingIntervalInput = screen.getByLabelText(/polling interval/i);
    expect(pollingIntervalInput).toBeInTheDocument();

    // Change the input value
    fireEvent.change(pollingIntervalInput, { target: { value: "60" } });

    // Check if callback was called
    expect(mockSetSettingsChanged).toHaveBeenCalledWith(true);
  });

  it("renders tooltips with helpful information", () => {
    const { container } = setupTest();

    // Check for help icons using the lucide-circle-help class directly in the DOM
    const helpIcons = container.querySelectorAll(".lucide-circle-help");
    expect(helpIcons.length).toBeGreaterThan(0);
  });
});
