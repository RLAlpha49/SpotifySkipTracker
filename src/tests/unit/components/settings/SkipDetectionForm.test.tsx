import { zodResolver } from "@hookform/resolvers/zod";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import * as z from "zod";
import { SkipDetectionForm } from "../../../../components/settings/SkipDetectionForm";
import { settingsFormSchema } from "../../../../components/settings/settingsFormSchema";

// Mock the Slider component since it's difficult to test with JSDOM
vi.mock("../../../../components/ui/slider", () => ({
  Slider: ({ value, onValueChange }: any) => (
    <div data-testid="mock-slider">
      <input
        type="range"
        min="10"
        max="90"
        step="5"
        value={value[0]}
        onChange={(e) => onValueChange([parseInt(e.target.value)])}
      />
    </div>
  ),
}));

// Create a wrapper component to provide the form context
function FormWrapper({
  children,
  defaultValues,
  skipProgress = 50,
  setSkipProgress = vi.fn(),
  setSettingsChanged = vi.fn(),
}: {
  children: React.ReactNode;
  defaultValues?: Partial<z.infer<typeof settingsFormSchema>>;
  skipProgress?: number;
  setSkipProgress?: (value: number) => void;
  setSettingsChanged?: (changed: boolean) => void;
}) {
  const form = useForm<z.infer<typeof settingsFormSchema>>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      clientId: "",
      clientSecret: "",
      redirectUri: "",
      fileLogLevel: "INFO",
      logLineCount: 500,
      maxLogFiles: 10,
      logRetentionDays: 30,
      skipThreshold: 3,
      timeframeInDays: 30,
      autoStartMonitoring: true,
      autoUnlike: true,
      pollingInterval: 1000,
      ...defaultValues,
    },
  });

  return React.cloneElement(children as React.ReactElement, {
    form,
    skipProgress,
    setSkipProgress,
    setSettingsChanged,
  });
}

describe("SkipDetectionForm Component", () => {
  const mockSetSkipProgress = vi.fn();
  const mockSetSettingsChanged = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the form with default values", () => {
    const defaultValues = {
      skipThreshold: 3,
      timeframeInDays: 30,
      autoUnlike: true,
    };

    const skipProgress = 50;

    render(
      <FormWrapper
        defaultValues={defaultValues}
        skipProgress={skipProgress}
        setSkipProgress={mockSetSkipProgress}
        setSettingsChanged={mockSetSettingsChanged}
      >
        <SkipDetectionForm />
      </FormWrapper>,
    );

    // Check title and description
    expect(screen.getByText("Skip Detection Settings")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Configure how skips are detected and when tracks are removed",
      ),
    ).toBeInTheDocument();

    // Check if the form fields are rendered with correct values
    const skipThresholdInput = screen.getByLabelText(
      /Skip Count Threshold/i,
    ) as HTMLInputElement;
    expect(skipThresholdInput.value).toBe("3");

    const timeframeInput = screen.getByLabelText(
      /Analysis Timeframe \(days\)/i,
    ) as HTMLInputElement;
    expect(timeframeInput.value).toBe("30");

    // Check slider label with current skip progress
    expect(
      screen.getByText(`Skip Progress Threshold: ${skipProgress}%`),
    ).toBeInTheDocument();

    // Check auto-unlike switch
    const autoUnlikeSwitch = screen.getByRole("switch") as HTMLInputElement;
    expect(autoUnlikeSwitch.checked).toBe(true);
  });

  it("should call setSettingsChanged when form values change", () => {
    render(
      <FormWrapper
        skipProgress={50}
        setSkipProgress={mockSetSkipProgress}
        setSettingsChanged={mockSetSettingsChanged}
      >
        <SkipDetectionForm />
      </FormWrapper>,
    );

    // Change skip threshold
    const skipThresholdInput = screen.getByLabelText(/Skip Count Threshold/i);
    fireEvent.change(skipThresholdInput, { target: { value: 5 } });
    expect(mockSetSettingsChanged).toHaveBeenCalledWith(true);

    // Reset mock
    mockSetSettingsChanged.mockClear();

    // Change timeframe
    const timeframeInput = screen.getByLabelText(
      /Analysis Timeframe \(days\)/i,
    );
    fireEvent.change(timeframeInput, { target: { value: 60 } });
    expect(mockSetSettingsChanged).toHaveBeenCalledWith(true);

    // Reset mock
    mockSetSettingsChanged.mockClear();

    // Toggle the auto-unlike switch
    const autoUnlikeSwitch = screen.getByRole("switch");
    fireEvent.click(autoUnlikeSwitch);
    expect(mockSetSettingsChanged).toHaveBeenCalledWith(true);
  });

  it("should update skip progress when slider value changes", () => {
    render(
      <FormWrapper
        skipProgress={50}
        setSkipProgress={mockSetSkipProgress}
        setSettingsChanged={mockSetSettingsChanged}
      >
        <SkipDetectionForm />
      </FormWrapper>,
    );

    // Find the mock slider and change its value
    const sliderInput = screen
      .getByTestId("mock-slider")
      .querySelector("input") as HTMLInputElement;
    fireEvent.change(sliderInput, { target: { value: 70 } });

    // Verify both functions were called
    expect(mockSetSkipProgress).toHaveBeenCalledWith(70);
    expect(mockSetSettingsChanged).toHaveBeenCalledWith(true);
  });

  it("should display tooltips with helpful information", async () => {
    render(
      <FormWrapper
        skipProgress={50}
        setSkipProgress={mockSetSkipProgress}
        setSettingsChanged={mockSetSettingsChanged}
      >
        <SkipDetectionForm />
      </FormWrapper>,
    );

    // Get all help icons (tooltips)
    const helpIcons = screen
      .getAllByRole("img", { hidden: true })
      .filter((icon) => icon.tagName.toLowerCase() === "svg");
    expect(helpIcons.length).toBeGreaterThan(0);

    // Check for tooltip content
    // Find the first help icon next to Skip Count Threshold
    const skipThresholdHelpIcon = screen.getAllByRole("img", {
      hidden: true,
    })[1];
    fireEvent.mouseOver(skipThresholdHelpIcon);

    // Check if tooltip content is displayed
    expect(
      await screen.findByText(
        /When a track is skipped this many times, it will be suggested for removal/,
      ),
    ).toBeInTheDocument();
  });
});
