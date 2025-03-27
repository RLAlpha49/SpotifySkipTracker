import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DevicesTab } from "../../../../components/statistics/DevicesTab";

// Mock the NoDataMessage component
vi.mock("../../../../components/statistics/NoDataMessage", () => ({
  NoDataMessage: ({ message }: { message: string }) => (
    <div data-testid="no-data-message">{message}</div>
  ),
}));

// Mock the ScrollArea component since it's a UI component
vi.mock("../../../../components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

describe("DevicesTab Component", () => {
  // Mock data for testing with various device types
  const mockStatistics = {
    deviceMetrics: {
      device1: {
        deviceName: "My iPhone",
        deviceType: "Smartphone",
        listeningTimeMs: 5400000, // 1h 30m
        tracksPlayed: 35,
        skipRate: 0.15,
        peakUsageHour: 9, // 9 AM
      },
      device2: {
        deviceName: "MacBook Pro",
        deviceType: "Computer",
        listeningTimeMs: 7200000, // 2h
        tracksPlayed: 50,
        skipRate: 0.32,
        peakUsageHour: 14, // 2 PM
      },
      device3: {
        deviceName: "iPad",
        deviceType: "Tablet",
        listeningTimeMs: 1800000, // 30m
        tracksPlayed: 12,
        skipRate: 0.45,
        peakUsageHour: 20, // 8 PM
      },
    },
  };

  it("should render loading skeletons when loading is true", () => {
    render(<DevicesTab loading={true} statistics={null} />);

    // Check for skeleton elements
    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should render no data message when no statistics or device metrics are available", () => {
    // Case 1: No statistics
    render(<DevicesTab loading={false} statistics={null} />);

    // Check for no data message
    expect(screen.getByTestId("no-data-message")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No device data available yet. Keep listening to music on different devices to generate insights!",
      ),
    ).toBeInTheDocument();

    // Case 2: Empty device metrics
    render(
      <DevicesTab loading={false} statistics={{ deviceMetrics: {} } as any} />,
    );

    // Check for no data message again
    expect(screen.getByTestId("no-data-message")).toBeInTheDocument();
  });

  it("should render device metrics when data is available", () => {
    render(<DevicesTab loading={false} statistics={mockStatistics as any} />);

    // Check for section titles
    expect(screen.getByText("Device Usage Comparison")).toBeInTheDocument();
    expect(screen.getByText("Skip Rates by Device")).toBeInTheDocument();
    expect(screen.getByText("Device Usage by Time of Day")).toBeInTheDocument();

    // Check for ScrollArea components
    const scrollAreas = screen.getAllByTestId("scroll-area");
    expect(scrollAreas.length).toBe(3); // One for each section

    // Check for device names
    expect(screen.getByText("My iPhone")).toBeInTheDocument();
    expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
    expect(screen.getByText("iPad")).toBeInTheDocument();

    // Check for device types
    expect(screen.getByText("Smartphone")).toBeInTheDocument();
    expect(screen.getByText("Computer")).toBeInTheDocument();
    expect(screen.getByText("Tablet")).toBeInTheDocument();
  });

  it("should display formatted listening times for each device", () => {
    render(<DevicesTab loading={false} statistics={mockStatistics as any} />);

    // Check for formatted time values
    expect(screen.getByText("1h 30m")).toBeInTheDocument(); // iPhone - 5400000ms
    expect(screen.getByText("2h")).toBeInTheDocument(); // MacBook Pro - 7200000ms
    expect(screen.getByText("30m")).toBeInTheDocument(); // iPad - 1800000ms
  });

  it("should display formatted skip rates with appropriate color classes", () => {
    render(<DevicesTab loading={false} statistics={mockStatistics as any} />);

    // Check for formatted skip rate values
    expect(screen.getAllByText("15%")).toHaveLength(2); // iPhone
    expect(screen.getAllByText("32%")).toHaveLength(2); // MacBook Pro
    expect(screen.getAllByText("45%")).toHaveLength(2); // iPad

    // Note: We can't easily test for specific class names directly on these values
    // as the component applies classes through template literals, but we can still
    // verify the values are displayed
  });

  it("should display tracks played for each device", () => {
    render(<DevicesTab loading={false} statistics={mockStatistics as any} />);

    // Check for tracks played values
    expect(screen.getByText("35")).toBeInTheDocument(); // iPhone
    expect(screen.getByText("50")).toBeInTheDocument(); // MacBook Pro
    expect(screen.getByText("12")).toBeInTheDocument(); // iPad
  });

  it("should display peak usage hour labels", () => {
    render(<DevicesTab loading={false} statistics={mockStatistics as any} />);

    // Check for peak usage hour labels
    expect(screen.getAllByText("9 AM")).toHaveLength(2); // iPhone - 9 AM
    expect(screen.getAllByText("2 PM")).toHaveLength(2); // MacBook Pro - 2 PM
    expect(screen.getAllByText("8 PM")).toHaveLength(2); // iPad - 8 PM

    // Check for the time periods
    expect(screen.getByText("(Morning)")).toBeInTheDocument(); // iPhone - 9 AM
    expect(screen.getByText("(Afternoon)")).toBeInTheDocument(); // MacBook Pro - 2 PM
    expect(screen.getByText("(Evening)")).toBeInTheDocument(); // iPad - 8 PM
  });

  it("should display progressbars for each device", () => {
    render(<DevicesTab loading={false} statistics={mockStatistics as any} />);

    // Check for progress elements (there should be 6 total - 3 for usage comparison, 3 for skip rates)
    const progressElements = screen.getAllByRole("progressbar");
    expect(progressElements.length).toBe(6);
  });
});
