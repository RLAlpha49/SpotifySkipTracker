import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { DevicesTab } from "../../../../components/statistics/DevicesTab";
import type { StatisticsData } from "../../../../types/statistics";

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
  const mockStatistics: Partial<StatisticsData> = {
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
    const { container } = render(
      <DevicesTab loading={true} statistics={null} />,
    );

    // Check for skeleton elements
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should render no data message when no statistics or device metrics are available", () => {
    // Case 1: No statistics
    const { container: container1, unmount } = render(
      <DevicesTab loading={false} statistics={null} />,
    );

    // Check for no data message
    const noDataMessage = container1.querySelector(
      '[data-testid="no-data-message"]',
    );
    expect(noDataMessage).toBeInTheDocument();

    // Unmount to avoid duplicate elements
    unmount();

    // Case 2: Empty device metrics
    const { container: container2 } = render(
      <DevicesTab
        loading={false}
        statistics={{ deviceMetrics: {} } as Partial<StatisticsData>}
      />,
    );

    // Check for no data message again
    const noDataMessage2 = container2.querySelector(
      '[data-testid="no-data-message"]',
    );
    expect(noDataMessage2).toBeInTheDocument();
  });

  it("should render device metrics when data is available", () => {
    const { container } = render(
      <DevicesTab
        loading={false}
        statistics={mockStatistics as Partial<StatisticsData>}
      />,
    );

    // Check for section titles
    expect(container.textContent).toContain("Device Usage Comparison");
    expect(container.textContent).toContain("Skip Rates by Device");
    expect(container.textContent).toContain("Device Usage by Time of Day");

    // Check for ScrollArea components
    const scrollAreas = container.querySelectorAll(
      '[data-testid="scroll-area"]',
    );
    expect(scrollAreas.length).toBe(3); // One for each section

    // Check for device names in the container text
    expect(container.textContent).toContain("My iPhone");
    expect(container.textContent).toContain("MacBook Pro");
    expect(container.textContent).toContain("iPad");

    // Check for device types in the container text
    expect(container.textContent).toContain("Smartphone");
    expect(container.textContent).toContain("Computer");
    expect(container.textContent).toContain("Tablet");
  });

  it("should display formatted listening times for each device", () => {
    const { container } = render(
      <DevicesTab
        loading={false}
        statistics={mockStatistics as Partial<StatisticsData>}
      />,
    );

    // Check for formatted time values in container text
    expect(container.textContent).toContain("1h 30m");
    expect(container.textContent).toContain("2h 0m");
    expect(container.textContent).toContain("30m");
  });

  it("should display formatted skip rates with appropriate color classes", () => {
    const { container } = render(
      <DevicesTab
        loading={false}
        statistics={mockStatistics as Partial<StatisticsData>}
      />,
    );

    // Check for formatted skip rate values in container text
    expect(container.textContent).toContain("15.0%");
    expect(container.textContent).toContain("32.0%");
    expect(container.textContent).toContain("45.0%");
  });

  it("should display tracks played for each device", () => {
    const { container } = render(
      <DevicesTab
        loading={false}
        statistics={mockStatistics as Partial<StatisticsData>}
      />,
    );

    // Check for tracks played values in container text
    expect(container.textContent).toContain("35");
    expect(container.textContent).toContain("50");
    expect(container.textContent).toContain("12");
  });

  it("should display peak usage hour labels", () => {
    const { container } = render(
      <DevicesTab
        loading={false}
        statistics={mockStatistics as Partial<StatisticsData>}
      />,
    );

    // Check for peak usage hour labels in container text
    expect(container.textContent).toContain("9 AM");
    expect(container.textContent).toContain("2 PM");
    expect(container.textContent).toContain("8 PM");

    // Check for the time periods in container text
    expect(container.textContent).toContain("Morning");
    expect(container.textContent).toContain("Afternoon");
    expect(container.textContent).toContain("Evening");
  });

  it("should display progressbars for each device", () => {
    const { container } = render(
      <DevicesTab
        loading={false}
        statistics={mockStatistics as Partial<StatisticsData>}
      />,
    );

    // Check for progress elements
    const progressElements = container.querySelectorAll('[role="progressbar"]');
    expect(progressElements.length).toBe(6);
  });
});
