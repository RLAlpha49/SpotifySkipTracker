import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TracksTab } from "../../../../components/statistics/TracksTab";

// Mock the NoDataMessage component
vi.mock("../../../../components/statistics/NoDataMessage", () => ({
  NoDataMessage: ({ message }: { message: string }) => (
    <div data-testid="no-data-message">{message}</div>
  ),
}));

// Mock the ScrollArea component since it's a UI component
vi.mock("../../../../components/ui/scroll-area", () => ({
  ScrollArea: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="scroll-area" className={className}>
      {children}
    </div>
  ),
}));

// Mock the chart components
vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="recharts-bar"></div>,
  XAxis: () => <div data-testid="x-axis"></div>,
  YAxis: () => <div data-testid="y-axis"></div>,
  CartesianGrid: () => <div data-testid="cartesian-grid"></div>,
}));

vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="chart-container" className={className}>
      {children}
    </div>
  ),
  ChartTooltip: ({ content }: { content: React.ReactNode }) => (
    <div data-testid="chart-tooltip">{content}</div>
  ),
  ChartTooltipContent: ({ formatter, labelFormatter }: any) => (
    <div data-testid="chart-tooltip-content">Tooltip Content</div>
  ),
}));

describe("TracksTab Component", () => {
  // Mock data for testing
  const mockStatistics = {
    trackMetrics: {
      track1: {
        name: "Track One",
        artistName: "Artist A",
        playCount: 10,
        skipCount: 2,
        avgCompletionPercent: 85,
        hasBeenRepeated: true,
      },
      track2: {
        name: "Track Two",
        artistName: "Artist B",
        playCount: 15,
        skipCount: 5,
        avgCompletionPercent: 65,
        hasBeenRepeated: false,
      },
      track3: {
        name: "Track Three",
        artistName: "Artist C",
        playCount: 5,
        skipCount: 4,
        avgCompletionPercent: 35,
        hasBeenRepeated: false,
      },
      track4: {
        name: "Track Four",
        artistName: "Artist A",
        playCount: 20,
        skipCount: 0,
        avgCompletionPercent: 95,
        hasBeenRepeated: true,
      },
      track5: {
        name: "Track Five",
        artistName: "Artist D",
        playCount: 8,
        skipCount: 1,
        avgCompletionPercent: 75,
        hasBeenRepeated: false,
      },
    },
  };

  it("should render loading skeletons when loading is true", () => {
    render(<TracksTab loading={true} statistics={null} />);

    // Check for skeleton elements
    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should render no data message when no statistics or track metrics are available", () => {
    // Case 1: No statistics
    render(<TracksTab loading={false} statistics={null} />);

    // Check for no data message
    expect(screen.getByTestId("no-data-message")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No track data available yet. Keep listening to music to generate insights!",
      ),
    ).toBeInTheDocument();

    // Case 2: Empty track metrics
    render(
      <TracksTab loading={false} statistics={{ trackMetrics: {} } as any} />,
    );

    // Check for no data message again
    expect(screen.getByTestId("no-data-message")).toBeInTheDocument();
  });

  it("should render track metrics in list view by default", () => {
    render(<TracksTab loading={false} statistics={mockStatistics as any} />);

    // Check for section titles
    expect(screen.getByText("Most Played Tracks")).toBeInTheDocument();
    expect(screen.getByText("Most Skipped Tracks")).toBeInTheDocument();

    // Check for ScrollArea components
    const scrollAreas = screen.getAllByTestId("scroll-area");
    expect(scrollAreas.length).toBeGreaterThan(0);

    // Check for track names in most played list
    expect(screen.getByText("Track Four")).toBeInTheDocument();
    expect(screen.getByText("Track Two")).toBeInTheDocument();
    expect(screen.getByText("Track One")).toBeInTheDocument();

    // Check for artist names
    expect(screen.getAllByText("Artist A")).toHaveLength(2); // Two tracks from Artist A
    expect(screen.getByText("Artist B")).toBeInTheDocument();
    expect(screen.getByText("Artist C")).toBeInTheDocument();
    expect(screen.getByText("Artist D")).toBeInTheDocument();
  });

  it("should display play counts for each track", () => {
    render(<TracksTab loading={false} statistics={mockStatistics as any} />);

    // Check for play count displays
    expect(screen.getByText("20 plays")).toBeInTheDocument(); // Track Four
    expect(screen.getByText("15 plays")).toBeInTheDocument(); // Track Two
    expect(screen.getByText("10 plays")).toBeInTheDocument(); // Track One
    expect(screen.getByText("8 plays")).toBeInTheDocument(); // Track Five
    expect(screen.getByText("5 plays")).toBeInTheDocument(); // Track Three
  });

  it("should display completion percentages for each track", () => {
    render(<TracksTab loading={false} statistics={mockStatistics as any} />);

    // Check for completion percentage values
    expect(screen.getByText("95%")).toBeInTheDocument(); // Track Four
    expect(screen.getByText("85%")).toBeInTheDocument(); // Track One
    expect(screen.getByText("75%")).toBeInTheDocument(); // Track Five
    expect(screen.getByText("65%")).toBeInTheDocument(); // Track Two
    expect(screen.getByText("35%")).toBeInTheDocument(); // Track Three
  });

  it("should display repeated indicator for tracks that have been repeated", () => {
    render(<TracksTab loading={false} statistics={mockStatistics as any} />);

    // Check for "Repeated" text on tracks that have been repeated
    const repeatedTexts = screen.getAllByText("Repeated");
    expect(repeatedTexts.length).toBe(2); // Two tracks have hasBeenRepeated: true
  });

  it("should display skip rates in the most skipped tracks section", () => {
    render(<TracksTab loading={false} statistics={mockStatistics as any} />);

    // Check for skip rate percentage values
    // Track Three: 4/5 = 80%
    expect(screen.getByText("80%")).toBeInTheDocument();
    // Track Two: 5/15 = 33%
    expect(screen.getByText("33%")).toBeInTheDocument();
    // Track One: 2/10 = 20%
    expect(screen.getByText("20%")).toBeInTheDocument();
    // Track Five: 1/8 = 13%
    expect(screen.getByText("13%")).toBeInTheDocument();
  });

  it("should switch from list view to bar chart view when toggle is clicked", () => {
    render(<TracksTab loading={false} statistics={mockStatistics as any} />);

    // Find and click the bar chart toggle
    const barChartToggle = screen.getByLabelText("Bar chart");
    fireEvent.click(barChartToggle);

    // Verify bar chart components are rendered
    expect(screen.getByTestId("chart-container")).toBeInTheDocument();
    expect(screen.getByTestId("recharts-bar-chart")).toBeInTheDocument();
    expect(screen.getByTestId("recharts-bar")).toBeInTheDocument();
    expect(screen.getByTestId("x-axis")).toBeInTheDocument();
    expect(screen.getByTestId("y-axis")).toBeInTheDocument();

    // Switch back to list view
    const listViewToggle = screen.getByLabelText("List view");
    fireEvent.click(listViewToggle);

    // Verify list view is back
    expect(screen.queryByTestId("recharts-bar-chart")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("scroll-area")).toHaveLength(2);
  });

  it("should display progress bars for each track in most played list", () => {
    render(<TracksTab loading={false} statistics={mockStatistics as any} />);

    // Check for progress elements
    const progressElements = screen.getAllByRole("progressbar");
    expect(progressElements.length).toBeGreaterThan(0);

    // First few progress bars should match our top tracks
    // We can't easily test the exact values or classes, but we can ensure they exist
  });
});
