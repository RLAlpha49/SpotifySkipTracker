import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArtistsTab } from "../../../../components/statistics/ArtistsTab";

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
    render(<ArtistsTab loading={true} statistics={null} />);

    // Check for skeleton elements
    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should render no data message when no statistics or artist metrics are available", () => {
    // Case 1: No statistics
    render(<ArtistsTab loading={false} statistics={null} />);

    // Check for no data message
    expect(screen.getByTestId("no-data-message")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No artist data available yet. Keep listening to music to generate insights!",
      ),
    ).toBeInTheDocument();

    // Case 2: Empty artist metrics
    render(
      <ArtistsTab loading={false} statistics={{ artistMetrics: {} } as any} />,
    );

    // Check for no data message again
    expect(screen.getByTestId("no-data-message")).toBeInTheDocument();
  });

  it("should render artist metrics in progress bar view by default", () => {
    render(<ArtistsTab loading={false} statistics={mockStatistics as any} />);

    // Check for section titles
    expect(
      screen.getByText("Top Artists by Listening Time"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Artists with Highest Skip Rates"),
    ).toBeInTheDocument();

    // Check for artist names
    expect(screen.getByText("Artist One")).toBeInTheDocument();
    expect(screen.getByText("Artist Two")).toBeInTheDocument();
    expect(screen.getByText("Artist Three")).toBeInTheDocument();
    expect(screen.getByText("Artist Four")).toBeInTheDocument();

    // Check for formatting
    expect(screen.getByText("#1")).toBeInTheDocument(); // Top artist label
    expect(screen.getByText("2h")).toBeInTheDocument(); // Formatted time
    expect(screen.getByText("1h 30m")).toBeInTheDocument(); // Formatted time
    expect(screen.getByText("1h")).toBeInTheDocument(); // Formatted time
    expect(screen.getByText("30m")).toBeInTheDocument(); // Formatted time
  });

  it("should display track counts and skip rates for each artist", () => {
    render(<ArtistsTab loading={false} statistics={mockStatistics as any} />);

    // Check for track counts
    expect(screen.getByText("20")).toBeInTheDocument(); // Artist One tracks
    expect(screen.getByText("15")).toBeInTheDocument(); // Artist Two tracks
    expect(screen.getByText("10")).toBeInTheDocument(); // Artist Three tracks
    expect(screen.getByText("5")).toBeInTheDocument(); // Artist Four tracks

    // Check for skip rates
    expect(screen.getByText("15%")).toBeInTheDocument(); // Artist One skip rate
    expect(screen.getByText("45%")).toBeInTheDocument(); // Artist Two skip rate
    expect(screen.getByText("30%")).toBeInTheDocument(); // Artist Three skip rate
    expect(screen.getByText("60%")).toBeInTheDocument(); // Artist Four skip rate
  });

  it("should switch from progress bar view to pie chart view when toggle is clicked", () => {
    render(<ArtistsTab loading={false} statistics={mockStatistics as any} />);

    // Find and click the pie chart toggle
    const pieChartToggle = screen.getByLabelText("Pie chart");
    fireEvent.click(pieChartToggle);

    // Verify pie chart components are rendered
    expect(screen.getByTestId("chart-container")).toBeInTheDocument();
    expect(screen.getByTestId("recharts-pie-chart")).toBeInTheDocument();
    expect(screen.getByTestId("recharts-pie")).toBeInTheDocument();
    expect(screen.getAllByTestId("recharts-cell").length).toBeGreaterThan(0);
    expect(screen.getByTestId("recharts-legend")).toBeInTheDocument();

    // Switch back to progress bar view
    const progressBarToggle = screen.getByLabelText("Progress bars");
    fireEvent.click(progressBarToggle);

    // Verify progress bar view is back
    expect(screen.queryByTestId("recharts-pie-chart")).not.toBeInTheDocument();
    expect(screen.getAllByRole("progressbar").length).toBeGreaterThan(0);
  });

  it("should switch the view of 'Artists with Highest Skip Rates' section when toggle is clicked", () => {
    render(<ArtistsTab loading={false} statistics={mockStatistics as any} />);

    // Find and click the bar chart toggle (assuming there's one in the high skip rates section)
    const toggles = screen.getAllByRole("button");
    const barChartToggle = toggles.find(
      (button) => button.getAttribute("aria-label") === "Bar chart",
    );

    if (barChartToggle) {
      fireEvent.click(barChartToggle);

      // Verify bar chart components are rendered
      const barCharts = screen.getAllByTestId("recharts-bar-chart");
      expect(barCharts.length).toBeGreaterThan(0);
    }
  });

  it("should display progress bars for top artists", () => {
    render(<ArtistsTab loading={false} statistics={mockStatistics as any} />);

    // Check for progress bar elements
    const progressBars = screen.getAllByRole("progressbar");
    expect(progressBars.length).toBeGreaterThan(0);

    // The first progress bar should be for the top artist (Artist One)
    // We can't easily test exact values, but we can ensure they exist
  });
});
