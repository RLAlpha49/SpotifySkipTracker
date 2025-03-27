import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OverviewTab } from "../../../../components/statistics/OverviewTab";

// Mock the NoDataMessage component
vi.mock("../../../../components/statistics/NoDataMessage", () => ({
  NoDataMessage: ({ message }: { message: string }) => (
    <div data-testid="no-data-message">{message}</div>
  ),
}));

describe("OverviewTab Component", () => {
  // Mock data for testing
  const mockStatistics = {
    totalUniqueTracks: 150,
    totalUniqueArtists: 45,
    repeatListeningRate: 0.25,
    artistMetrics: {
      artist1: {},
      artist2: {},
      artist3: {},
    },
    deviceMetrics: {
      device1: {},
      device2: {},
    },
    // Add other required properties from the StatisticsData type
  };

  const mockStatsSummary = {
    totalListeningTime: "25h 30m",
    skipRate: "32%",
    skipRateValue: 0.32,
    discoveryRate: "15%",
    totalTracks: 200,
    totalArtists: 45,
    mostActiveDay: "Saturday",
    peakListeningHour: "8 PM",
    recentTracksCount: 12,
    recentSkipCount: 3,
    recentListeningTime: "1h 15m",
  };

  it("should render loading skeletons when loading is true", () => {
    const { container } = render(
      <OverviewTab loading={true} statistics={null} statsSummary={null} />,
    );

    // Check for skeleton elements using container query
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should render no data message when statistics is null", () => {
    render(
      <OverviewTab loading={false} statistics={null} statsSummary={null} />,
    );

    // Check for no data message
    expect(screen.getByTestId("no-data-message")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No statistics data available yet. Keep listening to music to generate insights!",
      ),
    ).toBeInTheDocument();
  });

  it("should render all statistic cards when data is provided", () => {
    const { container } = render(
      <OverviewTab
        loading={false}
        statistics={mockStatistics as any}
        statsSummary={mockStatsSummary}
      />,
    );

    // Check for card titles
    expect(screen.getByText("Total Listening Time")).toBeInTheDocument();
    expect(screen.getByText("Skip Rate")).toBeInTheDocument();
    expect(screen.getByText("Artists")).toBeInTheDocument();
    expect(screen.getByText("Most Active Day")).toBeInTheDocument();
    expect(screen.getByText("Today's Listening")).toBeInTheDocument();
    expect(screen.getByText("Tracks")).toBeInTheDocument();
    expect(screen.getByText("Repeat Rate")).toBeInTheDocument();
    expect(screen.getByText("Device Usage")).toBeInTheDocument();

    // Just check that cards are rendered
    const cards = container.querySelectorAll('[data-slot="card"]');
    expect(cards.length).toBeGreaterThan(1);
  });

  it("should display the correct subtext information", () => {
    render(
      <OverviewTab
        loading={false}
        statistics={mockStatistics as any}
        statsSummary={mockStatsSummary}
      />,
    );

    // Check for subtext information
    expect(screen.getByText("150 unique tracks played")).toBeInTheDocument();
    expect(screen.getByText("Peak hour: 8 PM")).toBeInTheDocument();
    expect(screen.getByText("12 tracks (3 skipped)")).toBeInTheDocument();
    expect(screen.getByText("3 artists tracked")).toBeInTheDocument();
    expect(
      screen.getByText("Tracks repeated within sessions"),
    ).toBeInTheDocument();
    expect(screen.getByText("Devices tracked")).toBeInTheDocument();
  });

  it("should apply appropriate styling based on metric values", () => {
    const { container } = render(
      <OverviewTab
        loading={false}
        statistics={mockStatistics as any}
        statsSummary={mockStatsSummary}
      />,
    );

    // Check that the Progress component has the correct color class for skip rate (mockStatsSummary.skipRateValue = 0.32)
    const progressElement = screen.getByRole("progressbar");
    expect(progressElement).toHaveClass("bg-amber-500");

    // Check that cards are rendered
    const cards = container.querySelectorAll('[data-slot="card"]');
    expect(cards.length).toBeGreaterThan(1);
  });
});
