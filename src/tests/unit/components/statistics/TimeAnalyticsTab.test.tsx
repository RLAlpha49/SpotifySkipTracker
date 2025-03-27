import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TimeAnalyticsTab } from "../../../../components/statistics/TimeAnalyticsTab";

// Mock the NoDataMessage component
vi.mock("../../../../components/statistics/NoDataMessage", () => ({
  NoDataMessage: ({ message }: { message: string }) => (
    <div data-testid="no-data-message">{message}</div>
  ),
}));

// Mock the progress component since it's a UI component
vi.mock("@/components/ui/progress", () => ({
  Progress: ({ value, className }: { value: number; className?: string }) => (
    <div
      data-testid="progress-bar"
      role="progressbar"
      aria-valuenow={value}
      className={className}
    ></div>
  ),
}));

// Mock recharts components
vi.mock("recharts", () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-area-chart">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-line-chart">{children}</div>
  ),
  ComposedChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-composed-chart">{children}</div>
  ),
  ResponsiveContainer: ({
    children,
  }: {
    children: React.ReactNode;
    width: string | number;
    height: string | number;
  }) => <div data-testid="recharts-responsive-container">{children}</div>,
  Area: () => <div data-testid="recharts-area"></div>,
  Line: () => <div data-testid="recharts-line"></div>,
  Bar: () => <div data-testid="recharts-bar"></div>,
  XAxis: () => <div data-testid="recharts-xaxis"></div>,
  YAxis: () => <div data-testid="recharts-yaxis"></div>,
  CartesianGrid: () => <div data-testid="recharts-cartesian-grid"></div>,
  Tooltip: () => <div data-testid="recharts-tooltip"></div>,
  Legend: () => <div data-testid="recharts-legend"></div>,
}));

describe("TimeAnalyticsTab Component", () => {
  // Create mock statistics data
  const mockStatistics = {
    monthlyMetrics: {
      "2023-01": {
        tracksPlayed: 150,
        listeningTimeMs: 18000000, // 5 hours
        skipRate: 0.2,
      },
      "2023-02": {
        tracksPlayed: 200,
        listeningTimeMs: 21600000, // 6 hours
        skipRate: 0.25,
      },
      "2023-03": {
        tracksPlayed: 250,
        listeningTimeMs: 25200000, // 7 hours
        skipRate: 0.15,
      },
    },
    dailyMetrics: {
      "2023-03-15": {
        tracksPlayed: 20,
        listeningTimeMs: 3600000, // 1 hour
        skipRate: 0.1,
      },
      "2023-03-16": {
        tracksPlayed: 25,
        listeningTimeMs: 4500000, // 1.25 hours
        skipRate: 0.2,
      },
      "2023-03-17": {
        tracksPlayed: 30,
        listeningTimeMs: 5400000, // 1.5 hours
        skipRate: 0.3,
      },
      "2023-03-18": {
        tracksPlayed: 15,
        listeningTimeMs: 2700000, // 0.75 hours
        skipRate: 0.25,
      },
      "2023-03-19": {
        tracksPlayed: 35,
        listeningTimeMs: 6300000, // 1.75 hours
        skipRate: 0.15,
      },
      "2023-03-20": {
        tracksPlayed: 28,
        listeningTimeMs: 5040000, // 1.4 hours
        skipRate: 0.22,
      },
      "2023-03-21": {
        tracksPlayed: 32,
        listeningTimeMs: 5760000, // 1.6 hours
        skipRate: 0.18,
      },
    },
    hourlyMetrics: {
      "0": { tracksPlayed: 10, listeningTimeMs: 1800000, skipRate: 0.2 },
      "6": { tracksPlayed: 15, listeningTimeMs: 2700000, skipRate: 0.1 },
      "12": { tracksPlayed: 50, listeningTimeMs: 9000000, skipRate: 0.15 },
      "18": { tracksPlayed: 25, listeningTimeMs: 4500000, skipRate: 0.3 },
    },
    skipByTimeOfDayMetrics: {
      morning: 20,
      afternoon: 35,
      evening: 15,
      night: 10,
    },
  } as any;

  it("should render loading skeletons when loading is true", () => {
    render(<TimeAnalyticsTab loading={true} statistics={null} />);

    // Check for skeleton elements
    const skeletons = screen.getAllByClassName("h-5");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should render no data message when no statistics are available", () => {
    render(<TimeAnalyticsTab loading={false} statistics={null} />);

    // Check for no data message
    expect(screen.getByTestId("no-data-message")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No time analytics data available yet. Keep listening to music to generate insights!",
      ),
    ).toBeInTheDocument();
  });

  it("should render monthly listening activity in progress bar view by default", () => {
    render(<TimeAnalyticsTab loading={false} statistics={mockStatistics} />);

    // Check for section title
    expect(screen.getByText("Monthly Listening Activity")).toBeInTheDocument();

    // Check for month names
    expect(screen.getByText("January 2023")).toBeInTheDocument();
    expect(screen.getByText("February 2023")).toBeInTheDocument();
    expect(screen.getByText("March 2023")).toBeInTheDocument();

    // Check for listening times
    expect(screen.getByText("5h")).toBeInTheDocument();
    expect(screen.getByText("6h")).toBeInTheDocument();
    expect(screen.getByText("7h")).toBeInTheDocument();

    // Check for tracks played
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();

    // Check for progress bars
    const progressBars = screen.getAllByTestId("progress-bar");
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it("should render daily listening data for the last 7 days", () => {
    render(<TimeAnalyticsTab loading={false} statistics={mockStatistics} />);

    // Check for section title
    expect(
      screen.getByText("Daily Listening (Last 7 Days)"),
    ).toBeInTheDocument();

    // The days are formatted dynamically, so we can't check for specific dates
    // but we can check for the listening times
    expect(screen.getByText("1h")).toBeInTheDocument();
    expect(screen.getByText("1h 15m")).toBeInTheDocument();
    expect(screen.getByText("1h 30m")).toBeInTheDocument();
    expect(screen.getByText("45m")).toBeInTheDocument();
    expect(screen.getByText("1h 45m")).toBeInTheDocument();
    expect(screen.getByText("1h 24m")).toBeInTheDocument();
    expect(screen.getByText("1h 36m")).toBeInTheDocument();
  });

  it("should switch monthly view to area chart when toggle is clicked", () => {
    render(<TimeAnalyticsTab loading={false} statistics={mockStatistics} />);

    // Find and click the area chart toggle in the Monthly section
    const areaChartToggle = screen.getAllByLabelText("Area chart")[0];
    fireEvent.click(areaChartToggle);

    // Verify area chart components are rendered
    expect(
      screen.getByTestId("recharts-responsive-container"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("recharts-area-chart")).toBeInTheDocument();
    expect(screen.getByTestId("recharts-area")).toBeInTheDocument();
    expect(screen.getByTestId("recharts-line")).toBeInTheDocument();

    // Switch back to progress bar view
    const progressBarToggle = screen.getAllByLabelText("Progress bars")[0];
    fireEvent.click(progressBarToggle);

    // Verify progress bars are rendered again
    expect(screen.getAllByTestId("progress-bar").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("recharts-area-chart")).not.toBeInTheDocument();
  });

  it("should switch daily view to composed chart when toggle is clicked", () => {
    render(<TimeAnalyticsTab loading={false} statistics={mockStatistics} />);

    // Find and click the composed chart toggle in the Daily section
    const composedChartToggle = screen.getByLabelText("Composed chart");
    fireEvent.click(composedChartToggle);

    // Verify composed chart components are rendered
    expect(screen.getByTestId("recharts-composed-chart")).toBeInTheDocument();

    // Switch back to progress bar view
    const progressBarToggle = screen.getAllByLabelText("Progress bars")[1];
    fireEvent.click(progressBarToggle);

    // Verify progress bars are rendered again
    expect(screen.getAllByTestId("progress-bar").length).toBeGreaterThan(0);
    expect(
      screen.queryByTestId("recharts-composed-chart"),
    ).not.toBeInTheDocument();
  });

  it("should display hourly listening patterns section", () => {
    render(<TimeAnalyticsTab loading={false} statistics={mockStatistics} />);

    // Check for section titles
    expect(screen.getByText("Hourly Listening Patterns")).toBeInTheDocument();

    // We can't easily check specific hours as they're dynamically formatted
    // but we can check for the existence of hour labels
    expect(screen.getByText("12 PM")).toBeInTheDocument(); // Peak hour
  });
});
