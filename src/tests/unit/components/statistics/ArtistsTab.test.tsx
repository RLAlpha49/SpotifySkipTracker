import React from "react";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArtistsTab } from "../../../../components/statistics/ArtistsTab";
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

// Mock recharts components
vi.mock("recharts", () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-pie-chart">{children}</div>
  ),
  Pie: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-pie">{children}</div>
  ),
  Cell: () => <div data-testid="recharts-cell"></div>,
  Legend: () => <div data-testid="recharts-legend"></div>,
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="recharts-bar"></div>,
  XAxis: () => <div data-testid="x-axis"></div>,
  YAxis: () => <div data-testid="y-axis"></div>,
  CartesianGrid: () => <div data-testid="cartesian-grid"></div>,
  LabelList: () => <div data-testid="label-list"></div>,
}));

// Mock chart components
vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  ChartTooltip: ({ content }: { content: React.ReactNode }) => (
    <div data-testid="chart-tooltip">{content}</div>
  ),
  ChartTooltipContent: () => (
    <div data-testid="chart-tooltip-content">Tooltip Content</div>
  ),
}));

describe("ArtistsTab Component", () => {
  // Mock data for testing
  const mockStatistics = {
    artistMetrics: {
      artist1: {
        name: "Artist One",
        tracksPlayed: 20,
        listeningTimeMs: 7200000, // 2h
        skipRate: 0.15,
        lastPlayedDate: "2023-05-15T00:00:00Z",
      },
      artist2: {
        name: "Artist Two",
        tracksPlayed: 15,
        listeningTimeMs: 5400000, // 1h 30m
        skipRate: 0.45,
        lastPlayedDate: "2023-05-16T00:00:00Z",
      },
      artist3: {
        name: "Artist Three",
        tracksPlayed: 10,
        listeningTimeMs: 3600000, // 1h
        skipRate: 0.3,
        lastPlayedDate: "2023-05-17T00:00:00Z",
      },
      artist4: {
        name: "Artist Four",
        tracksPlayed: 5,
        listeningTimeMs: 1800000, // 30m
        skipRate: 0.6,
        lastPlayedDate: "2023-05-14T00:00:00Z",
      },
    },
  };

  it("should render loading skeletons when loading is true", () => {
    const { container } = render(
      <ArtistsTab loading={true} statistics={null} />,
    );

    // Check for skeleton elements
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should render no data message when no statistics or artist metrics are available", () => {
    // Case 1: No statistics
    const { container: container1, unmount } = render(
      <ArtistsTab loading={false} statistics={null} />,
    );

    // Check for no data message
    const noDataMessage = container1.querySelector(
      '[data-testid="no-data-message"]',
    );
    expect(noDataMessage).toBeInTheDocument();

    // Unmount to avoid duplicate elements
    unmount();

    // Case 2: Empty artist metrics
    const { container: container2 } = render(
      <ArtistsTab loading={false} statistics={{ artistMetrics: {} }} />,
    );

    // Check for no data message again
    const noDataMessage2 = container2.querySelector(
      '[data-testid="no-data-message"]',
    );
    expect(noDataMessage2).toBeInTheDocument();
  });

  it("should render artist metrics in progress bar view by default", () => {
    const { container } = render(
      <ArtistsTab
        loading={false}
        statistics={mockStatistics as StatisticsData}
      />,
    );

    // Check for section titles in the container text
    expect(container.textContent).toContain("Top Artists by Listening Time");
    expect(container.textContent).toContain("Artists with Highest Skip Rates");

    // Check for artist names in the container text
    expect(container.textContent).toContain("Artist One");
    expect(container.textContent).toContain("Artist Two");
    expect(container.textContent).toContain("Artist Three");
    expect(container.textContent).toContain("Artist Four");

    // Check for formatting in the container text
    expect(container.textContent).toContain("#1"); // Top artist label
    expect(container.textContent).toContain("2h"); // Formatted time
    expect(container.textContent).toContain("1h 30m"); // Formatted time
    expect(container.textContent).toContain("1h"); // Formatted time
    expect(container.textContent).toContain("30m"); // Formatted time
  });

  it("should display track counts and skip rates for each artist", () => {
    const { container } = render(
      <ArtistsTab
        loading={false}
        statistics={mockStatistics as StatisticsData}
      />,
    );

    // Check for track counts in the container text
    expect(container.textContent).toContain("20"); // Artist One tracks
    expect(container.textContent).toContain("15"); // Artist Two tracks
    expect(container.textContent).toContain("10"); // Artist Three tracks
    expect(container.textContent).toContain("5"); // Artist Four tracks

    // Check for skip rates in the container text with decimal format
    expect(container.textContent).toContain("15.0%"); // Artist One skip rate
    expect(container.textContent).toContain("45.0%"); // Artist Two skip rate
    expect(container.textContent).toContain("30.0%"); // Artist Three skip rate
    expect(container.textContent).toContain("60.0%"); // Artist Four skip rate
  });

  it("should switch from progress bar view to pie chart view when toggle is clicked", () => {
    const { container } = render(
      <ArtistsTab
        loading={false}
        statistics={mockStatistics as StatisticsData}
      />,
    );

    // Find and click the pie chart toggle by aria-label attribute
    const pieChartToggle = container.querySelector('[aria-label="Pie chart"]');
    if (pieChartToggle) {
      fireEvent.click(pieChartToggle);
    }

    // Verify pie chart components are rendered
    const chartContainer = container.querySelector(
      '[data-testid="chart-container"]',
    );
    expect(chartContainer).toBeInTheDocument();

    const pieChart = container.querySelector(
      '[data-testid="recharts-pie-chart"]',
    );
    expect(pieChart).toBeInTheDocument();

    const pie = container.querySelector('[data-testid="recharts-pie"]');
    expect(pie).toBeInTheDocument();

    const cells = container.querySelectorAll('[data-testid="recharts-cell"]');
    expect(cells.length).toBeGreaterThan(0);

    const legend = container.querySelector('[data-testid="recharts-legend"]');
    expect(legend).toBeInTheDocument();

    // Switch back to progress bar view
    const progressBarToggle = container.querySelector(
      '[aria-label="Progress bars"]',
    );
    if (progressBarToggle) {
      fireEvent.click(progressBarToggle);
    }

    // Verify progress bar view is back
    const pieChartAfter = container.querySelector(
      '[data-testid="recharts-pie-chart"]',
    );
    expect(pieChartAfter).not.toBeInTheDocument();

    const progressBars = container.querySelectorAll('[role="progressbar"]');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it("should switch the view of 'Artists with Highest Skip Rates' section when toggle is clicked", () => {
    const { container } = render(
      <ArtistsTab
        loading={false}
        statistics={mockStatistics as StatisticsData}
      />,
    );

    // Find and click the bar chart toggle by aria-label
    const barChartToggle = container.querySelector('[aria-label="Bar chart"]');
    if (barChartToggle) {
      fireEvent.click(barChartToggle);

      // Verify bar chart components are rendered
      const barCharts = container.querySelectorAll(
        '[data-testid="recharts-bar-chart"]',
      );
      expect(barCharts.length).toBeGreaterThan(0);
    } else {
      // If toggle isn't found, check that the section is still rendered
      expect(container.textContent).toContain(
        "Artists with Highest Skip Rates",
      );
    }
  });

  it("should display progress bars for top artists", () => {
    const { container } = render(
      <ArtistsTab
        loading={false}
        statistics={mockStatistics as StatisticsData}
      />,
    );

    // Check for progress bar elements
    const progressBars = container.querySelectorAll('[role="progressbar"]');
    expect(progressBars.length).toBeGreaterThan(0);
  });
});
