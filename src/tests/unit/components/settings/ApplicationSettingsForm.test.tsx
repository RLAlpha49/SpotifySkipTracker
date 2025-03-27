import { zodResolver } from "@hookform/resolvers/zod";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import * as z from "zod";
import { ApplicationSettingsForm } from "../../../../components/settings/ApplicationSettingsForm";
import { settingsFormSchema } from "../../../../components/settings/settingsFormSchema";

// Mock the ToggleTheme component
vi.mock("../../../../components/ToggleTheme", () => ({
  default: () => <div data-testid="toggle-theme">Theme Toggle Mock</div>,
}));

// Create a wrapper component to provide the form context
function FormWrapper({
  children,
  defaultValues,
  setSettingsChanged,
}: {
  children: React.ReactNode;
  defaultValues?: Partial<z.infer<typeof settingsFormSchema>>;
  setSettingsChanged: (changed: boolean) => void;
}) {
  const form = useForm<z.infer<typeof settingsFormSchema>>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
      redirectUri: "http://localhost:8888/callback",
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

  return React.cloneElement(children as React.ReactElement, { form });
}

describe("ApplicationSettingsForm Component", () => {
  const mockSetSettingsChanged = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the form with default values", () => {
    render(
      <FormWrapper setSettingsChanged={mockSetSettingsChanged}>
        <ApplicationSettingsForm setSettingsChanged={mockSetSettingsChanged} />
      </FormWrapper>,
    );

    // Check if the component renders the title
    expect(screen.getByText("Application Settings")).toBeInTheDocument();

    // Check if form sections are rendered
    expect(screen.getByText("Auto-Start Monitoring")).toBeInTheDocument();
    expect(screen.getByText("Polling Interval (ms)")).toBeInTheDocument();
    expect(screen.getByText("Logging Configuration")).toBeInTheDocument();
    expect(screen.getByText("Theme")).toBeInTheDocument();

    // Check default values
    const pollingInput = screen.getByLabelText(
      /Polling Interval \(ms\)/i,
    ) as HTMLInputElement;
    expect(pollingInput.value).toBe("1000");

    // Check if the toggle theme component is rendered
    expect(screen.getByTestId("toggle-theme")).toBeInTheDocument();

    // Check if switch is rendered and has correct default value
    const autoStartSwitch = screen.getByRole("switch") as HTMLInputElement;
    expect(autoStartSwitch.checked).toBe(true);
  });

  it("should render log settings with default values", () => {
    render(
      <FormWrapper setSettingsChanged={mockSetSettingsChanged}>
        <ApplicationSettingsForm setSettingsChanged={mockSetSettingsChanged} />
      </FormWrapper>,
    );

    // Check log level dropdown
    expect(screen.getByText("Log File Level")).toBeInTheDocument();
    expect(screen.getByText("Info")).toBeInTheDocument();

    // Check log line count, max log files, and retention days
    const logLineCountInput = screen.getByLabelText(
      /Log Line Count/i,
    ) as HTMLInputElement;
    expect(logLineCountInput.value).toBe("500");

    const maxLogFilesInput = screen.getByLabelText(
      /Max Log Files/i,
    ) as HTMLInputElement;
    expect(maxLogFilesInput.value).toBe("10");

    const logRetentionInput = screen.getByLabelText(
      /Log Retention Days/i,
    ) as HTMLInputElement;
    expect(logRetentionInput.value).toBe("30");
  });

  it("should call setSettingsChanged when Auto-Start Monitoring switch is toggled", () => {
    render(
      <FormWrapper setSettingsChanged={mockSetSettingsChanged}>
        <ApplicationSettingsForm setSettingsChanged={mockSetSettingsChanged} />
      </FormWrapper>,
    );

    const autoStartSwitch = screen.getByRole("switch");
    fireEvent.click(autoStartSwitch);

    expect(mockSetSettingsChanged).toHaveBeenCalledWith(true);
  });

  it("should call setSettingsChanged when polling interval is changed", () => {
    render(
      <FormWrapper setSettingsChanged={mockSetSettingsChanged}>
        <ApplicationSettingsForm setSettingsChanged={mockSetSettingsChanged} />
      </FormWrapper>,
    );

    const pollingInput = screen.getByLabelText(/Polling Interval \(ms\)/i);
    fireEvent.change(pollingInput, { target: { value: "2000" } });

    expect(mockSetSettingsChanged).toHaveBeenCalledWith(true);
  });

  it("should call setSettingsChanged when log settings are changed", () => {
    render(
      <FormWrapper setSettingsChanged={mockSetSettingsChanged}>
        <ApplicationSettingsForm setSettingsChanged={mockSetSettingsChanged} />
      </FormWrapper>,
    );

    // Change log line count
    const logLineCountInput = screen.getByLabelText(/Log Line Count/i);
    fireEvent.change(logLineCountInput, { target: { value: "1000" } });
    expect(mockSetSettingsChanged).toHaveBeenCalledWith(true);

    // Reset mock
    mockSetSettingsChanged.mockClear();

    // Change max log files
    const maxLogFilesInput = screen.getByLabelText(/Max Log Files/i);
    fireEvent.change(maxLogFilesInput, { target: { value: "20" } });
    expect(mockSetSettingsChanged).toHaveBeenCalledWith(true);

    // Reset mock
    mockSetSettingsChanged.mockClear();

    // Change log retention days
    const logRetentionInput = screen.getByLabelText(/Log Retention Days/i);
    fireEvent.change(logRetentionInput, { target: { value: "60" } });
    expect(mockSetSettingsChanged).toHaveBeenCalledWith(true);
  });

  it("should show tooltips with helpful information", async () => {
    render(
      <FormWrapper setSettingsChanged={mockSetSettingsChanged}>
        <ApplicationSettingsForm setSettingsChanged={mockSetSettingsChanged} />
      </FormWrapper>,
    );

    // Get help icons
    const helpIcons = screen.getAllByTestId("help-circle");
    expect(helpIcons.length).toBeGreaterThan(0);

    // Test tooltip for Auto-Start Monitoring
    fireEvent.mouseOver(helpIcons[0]);
    expect(
      await screen.findByText(
        /When enabled, the app will automatically begin monitoring your Spotify activity/,
      ),
    ).toBeInTheDocument();
  });

  it("should handle file log level selection", () => {
    render(
      <FormWrapper setSettingsChanged={mockSetSettingsChanged}>
        <ApplicationSettingsForm setSettingsChanged={mockSetSettingsChanged} />
      </FormWrapper>,
    );

    // Open the select dropdown
    const logLevelSelect = screen.getByRole("combobox");
    fireEvent.click(logLevelSelect);

    // Select a different log level
    const debugOption = screen.getByText("Debug");
    fireEvent.click(debugOption);

    expect(mockSetSettingsChanged).toHaveBeenCalledWith(true);
  });
});
