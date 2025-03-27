import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ListeningPatternsTab } from "../../../../components/statistics/ListeningPatternsTab";

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
  BarChart: ({
    children,
    layout,
  }: {
    children: React.ReactNode;
    layout?: string;
  }) => (
    <div data-testid={`recharts-bar-chart${layout ? `-${layout}` : ""}`}>
      {children}
    </div>
  ),
  Bar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-bar">{children}</div>
  ),
  Cell: () => <div data-testid="recharts-cell"></div>,
  Legend: () => <div data-testid="recharts-legend"></div>,
  RadialBarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-radial-bar-chart">{children}</div>
  ),
  RadialBar: () => <div data-testid="recharts-radial-bar"></div>,
  RadarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-radar-chart">{children}</div>
  ),
  Radar: () => <div data-testid="recharts-radar"></div>,
  PolarGrid: () => <div data-testid="recharts-polar-grid"></div>,
  PolarAngleAxis: () => <div data-testid="recharts-polar-angle-axis"></div>,
  CartesianGrid: () => <div data-testid="recharts-cartesian-grid"></div>,
  XAxis: () => <div data-testid="recharts-xaxis"></div>,
  YAxis: () => <div data-testid="recharts-yaxis"></div>,
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

describe("ListeningPatternsTab Component", () => {
  // Mock data for testing
  const mockStatistics = {
    artistMetrics: {
      artist1: {
        name: "Artist One",
        tracksPlayed: 20,
        skipRate: 0.15,
      },
      artist2: {
        name: "Artist Two",
        tracksPlayed: 15,
        skipRate: 0.45,
      },
      artist3: {
        name: "Artist Three",
        tracksPlayed: 10,
        skipRate: 0.3,
      },
      artist4: {
        name: "Artist Four",
        tracksPlayed: 5,
        skipRate: 0.6,
      },
      artist5: {
        name: "Artist Five",
        tracksPlayed: 8,
        skipRate: 0,
      },
    },
    hourlyDistribution: {
      0: 5, // 12 AM
      1: 3,
      2: 2, // 2 AM
      3: 1,
      8: 8, // 8 AM
      9: 12,
      12: 15, // 12 PM
      13: 20,
      16: 12, // 4 PM
      17: 15,
      20: 25, // 8 PM
      21: 30,
    },
    dailyDistribution: [10, 15, 20, 25, 30, 40, 20], // Sun to Sat
    sessions: [],
  } as any;

  it("should render loading skeletons when loading is true", () => {
    render(<ListeningPatternsTab loading={true} statistics={null} />);

    // Check for skeleton elements
    const skeletons = screen.getAllByClassName("h-5");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should render no data message when no statistics are available", () => {
    render(<ListeningPatternsTab loading={false} statistics={null} />);

    // Check for no data message
    expect(screen.getByTestId("no-data-message")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No listening pattern data available yet. Keep listening to music to generate insights!",
      ),
    ).toBeInTheDocument();
  });

  it("should render skip rate by artist with progress bars by default", () => {
    render(
      <ListeningPatternsTab loading={false} statistics={mockStatistics} />,
    );

    // Check for section titles
    expect(
      screen.getByText("Skip Rate by Artist (Top 20)"),
    ).toBeInTheDocument();

    // Check for artist names
    expect(screen.getByText("Artist One")).toBeInTheDocument();
    expect(screen.getByText("Artist Two")).toBeInTheDocument();
    expect(screen.getByText("Artist Three")).toBeInTheDocument();
    expect(screen.getByText("Artist Four")).toBeInTheDocument();
    expect(screen.getByText("Artist Five")).toBeInTheDocument();

    // Check for skip rates
    expect(screen.getByText("15%")).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();

    // Check for track counts
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();

    // Check for progress bars
    const progressBars = screen.getAllByTestId("progress-bar");
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it("should render listening time distribution with bar display by default", () => {
    render(
      <ListeningPatternsTab loading={false} statistics={mockStatistics} />,
    );

    // Check for section title
    expect(screen.getByText("Listening Time Distribution")).toBeInTheDocument();

    // Check for info text
    expect(
      screen.getByText("Time of day when you listen to music"),
    ).toBeInTheDocument();

    // Check for time labels (2-hour blocks)
    expect(screen.getByText("12 AM")).toBeInTheDocument(); // 12-2 AM
    expect(screen.getByText("2 AM")).toBeInTheDocument(); // 2-4 AM
    expect(screen.getByText("8 AM")).toBeInTheDocument(); // 8-10 AM
    expect(screen.getByText("12 PM")).toBeInTheDocument(); // 12-2 PM
    expect(screen.getByText("4 PM")).toBeInTheDocument(); // 4-6 PM
    expect(screen.getByText("8 PM")).toBeInTheDocument(); // 8-10 PM
  });

  it("should render weekly activity patterns section", () => {
    render(
      <ListeningPatternsTab loading={false} statistics={mockStatistics} />,
    );

    // Check for section title
    expect(screen.getByText("Weekly Activity Patterns")).toBeInTheDocument();

    // Check for day labels
    expect(screen.getByText("Sunday")).toBeInTheDocument();
    expect(screen.getByText("Monday")).toBeInTheDocument();
    expect(screen.getByText("Tuesday")).toBeInTheDocument();
    expect(screen.getByText("Wednesday")).toBeInTheDocument();
    expect(screen.getByText("Thursday")).toBeInTheDocument();
    expect(screen.getByText("Friday")).toBeInTheDocument();
    expect(screen.getByText("Saturday")).toBeInTheDocument();
  });

  it("should switch artist view to bar chart when toggle is clicked", () => {
    render(
      <ListeningPatternsTab loading={false} statistics={mockStatistics} />,
    );

    // Find and click the bar chart toggle for artists
    const barChartToggle = screen.getByLabelText("Bar chart");
    fireEvent.click(barChartToggle);

    // Verify bar chart components are rendered
    expect(screen.getByTestId("chart-container")).toBeInTheDocument();
    expect(
      screen.getByTestId("recharts-bar-chart-vertical"),
    ).toBeInTheDocument();

    // Switch back to progress view
    const progressBarToggle = screen.getByLabelText("Progress bars");
    fireEvent.click(progressBarToggle);

    // Verify progress bars are back
    expect(screen.getAllByTestId("progress-bar").length).toBeGreaterThan(0);
    expect(
      screen.queryByTestId("recharts-bar-chart-vertical"),
    ).not.toBeInTheDocument();
  });

  it("should switch time distribution to radial chart when toggle is clicked", () => {
    render(
      <ListeningPatternsTab loading={false} statistics={mockStatistics} />,
    );

    // Find and click the radial chart toggle for time distribution
    const radialChartToggle = screen.getByLabelText("Radial chart");
    fireEvent.click(radialChartToggle);

    // Verify radial chart components are rendered
    expect(screen.getByTestId("recharts-radial-bar-chart")).toBeInTheDocument();

    // Switch back to bar display
    const barDisplayToggle = screen.getByLabelText("Bar display");
    fireEvent.click(barDisplayToggle);

    // Verify bar display is back
    expect(
      screen.queryByTestId("recharts-radial-bar-chart"),
    ).not.toBeInTheDocument();
  });

  it("should switch weekly activity to radar chart when toggle is clicked", () => {
    render(
      <ListeningPatternsTab loading={false} statistics={mockStatistics} />,
    );

    // Find the radar chart toggle for weekly activity
    const toggles = screen.getAllByRole("button");
    const radarChartToggle = toggles.find(
      (button) => button.getAttribute("aria-label") === "Radar chart",
    );

    if (radarChartToggle) {
      // Click the toggle
      fireEvent.click(radarChartToggle);

      // Verify radar chart components are rendered
      expect(screen.getByTestId("recharts-radar-chart")).toBeInTheDocument();

      // Find the bar chart toggle
      const barChartToggle = toggles.find(
        (button) => button.getAttribute("aria-label") === "Bar chart",
      );

      if (barChartToggle) {
        // Switch back to bar chart
        fireEvent.click(barChartToggle);

        // Verify bar chart is back
        expect(
          screen.queryByTestId("recharts-radar-chart"),
        ).not.toBeInTheDocument();
      }
    }
  });
});
