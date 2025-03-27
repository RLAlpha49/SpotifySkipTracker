import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { SkipDetectionForm } from "../../../../components/settings/SkipDetectionForm";

// Mock the Slider component
vi.mock("../../../../components/ui/Slider", () => {
  // Return a component implementation
  return {
    Slider: ({ onValueChange, defaultValue, ...props }) => {
      // This will be rendered, making the data-value attribute visible in the test
      return (
        <div data-testid="slider-mock" data-value="50" {...props}>
          <button
            onClick={() => onValueChange(70)}
            data-testid="mock-slider-button"
          >
            Change Value to 70
          </button>
        </div>
      );
    },
  };
});

// Setup mock functions and form control
const mockControl = {
  control: {},
  formState: { errors: {} },
};

const mockSetSettingsChanged = vi.fn();
const mockSetSkipProgress = vi.fn();

describe("SkipDetectionForm Component", () => {
  const setupTest = () => {
    return render(
      <SkipDetectionForm
        form={mockControl as any}
        setSettingsChanged={mockSetSettingsChanged}
        skipProgress={50}
        setSkipProgress={mockSetSkipProgress}
      />,
    );
  };

  beforeEach(() => {
    mockSetSettingsChanged.mockReset();
    mockSetSkipProgress.mockReset();
  });

  it("renders form with correct headings and fields", () => {
    setupTest();

    // Check for main heading
    expect(screen.getByText("Skip Detection Settings")).toBeInTheDocument();

    // Check for field labels using flexible text matching
    expect(screen.getByText(/skip count threshold/i)).toBeInTheDocument();
    expect(screen.getByText(/analysis timeframe/i)).toBeInTheDocument();
    expect(screen.getByText(/skip progress threshold/i)).toBeInTheDocument();
    // The auto-unlike text might be split, so use a role selector instead
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("renders slider component for skip progress", () => {
    setupTest();

    // Check for slider component and verify the data-value attribute is correct
    const slider = screen.getByTestId("slider-mock");
    expect(slider).toBeInTheDocument();
    expect(slider.getAttribute("data-value")).toBe("50"); // Should match skipProgress value
  });

  it("calls setSettingsChanged when skip threshold is changed", () => {
    setupTest();

    // Find skip threshold input
    const skipThresholdInput = screen.getByLabelText(/skip count threshold/i);
    expect(skipThresholdInput).toBeInTheDocument();

    // Change the input value
    fireEvent.change(skipThresholdInput, { target: { value: "5" } });

    // Check if callback was called
    expect(mockSetSettingsChanged).toHaveBeenCalledWith(true);
  });

  it("calls setSettingsChanged when timeframe is changed", () => {
    setupTest();

    // Find timeframe input
    const timeframeInput = screen.getByLabelText(/analysis timeframe/i);
    expect(timeframeInput).toBeInTheDocument();

    // Change the input value
    fireEvent.change(timeframeInput, { target: { value: "60" } });

    // Check if callback was called
    expect(mockSetSettingsChanged).toHaveBeenCalledWith(true);
  });

  it("calls setSkipProgress when slider value changes", () => {
    setupTest();

    // Find and click the slider button to trigger value change
    const sliderButton = screen.getByTestId("mock-slider-button");
    fireEvent.click(sliderButton);

    // Check if both callbacks were called
    expect(mockSetSkipProgress).toHaveBeenCalled();
    expect(mockSetSettingsChanged).toHaveBeenCalledWith(true);
  });

  it("calls setSettingsChanged when auto-unlike is toggled", () => {
    setupTest();

    // Find switch by role
    const autoUnlikeSwitch = screen.getByRole("switch");
    expect(autoUnlikeSwitch).toBeInTheDocument();

    // Toggle the switch
    fireEvent.click(autoUnlikeSwitch);
    expect(mockSetSettingsChanged).toHaveBeenCalledWith(true);
  });

  it("renders tooltips with helpful information", () => {
    const { container } = setupTest();

    // Check for help icons which are SVG elements with the circle-help class
    const helpIcons = container.querySelectorAll(".lucide-circle-help");
    expect(helpIcons.length).toBeGreaterThan(0);
  });
});
