import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SkipPatternsTab } from "../../../../components/statistics/SkipPatternsTab";

// Mock recharts components
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie">{children}</div>
  ),
  Cell: () => <div data-testid="cell"></div>,
  Tooltip: () => <div data-testid="tooltip"></div>,
  Legend: () => <div data-testid="legend"></div>,
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar"></div>,
  XAxis: () => <div data-testid="x-axis"></div>,
  YAxis: () => <div data-testid="y-axis"></div>,
  CartesianGrid: () => <div data-testid="cartesian-grid"></div>,
  RadialBarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="radial-bar-chart">{children}</div>
  ),
  RadialBar: () => <div data-testid="radial-bar"></div>,
}));

// Mock window.statisticsAPI
const mockGetSkipPatterns = vi.fn();
const mockTriggerAggregation = vi.fn();
const mockDetectPatterns = vi.fn();
const mockSaveLog = vi.fn();

vi.stubGlobal("window", {
  ...window,
  statisticsAPI: {
    getSkipPatterns: mockGetSkipPatterns,
    triggerAggregation: mockTriggerAggregation,
    detectPatterns: mockDetectPatterns,
  },
  spotify: {
    saveLog: mockSaveLog,
  },
});

describe("SkipPatternsTab Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render loading state", () => {
    render(<SkipPatternsTab loading={true} statistics={null} />);

    // Check for skeletons in loading state
    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons.length).toBeGreaterThan(0);

    // API should not be called in loading state
    expect(mockGetSkipPatterns).not.toHaveBeenCalled();
  });

  it("should render no patterns state and button to analyze", async () => {
    mockGetSkipPatterns.mockResolvedValue({
      success: true,
      data: [], // Empty patterns array
    });

    render(<SkipPatternsTab loading={false} statistics={null} />);

    // Wait for the patterns to load
    await waitFor(() => {
      expect(mockGetSkipPatterns).toHaveBeenCalledTimes(1);
    });

    // Check for the no patterns message
    expect(
      screen.getByText("No Skip Patterns Detected Yet"),
    ).toBeInTheDocument();

    // Check for the analyze button
    const analyzeButton = screen.getByText("Analyze Now");
    expect(analyzeButton).toBeInTheDocument();

    // Click analyze button
    fireEvent.click(analyzeButton);

    // Verify API calls for analysis
    await waitFor(() => {
      expect(mockTriggerAggregation).toHaveBeenCalledTimes(1);
    });
  });

  it("should render error state when API returns error", async () => {
    mockGetSkipPatterns.mockResolvedValue({
      success: false,
      error: "Failed to load patterns",
    });

    render(<SkipPatternsTab loading={false} statistics={null} />);

    // Wait for the API call to complete
    await waitFor(() => {
      expect(mockGetSkipPatterns).toHaveBeenCalledTimes(1);
    });

    // Check for error message
    expect(screen.getByText("Error Loading Patterns")).toBeInTheDocument();
    expect(screen.getByText("Failed to load patterns")).toBeInTheDocument();

    // Check for retry button
    const retryButton = screen.getByText("Try Again");
    expect(retryButton).toBeInTheDocument();
  });

  it("should render patterns and charts when data is available", async () => {
    // Mock successful pattern data
    const mockPatterns = [
      {
        id: "pattern1",
        type: "artist_aversion",
        confidence: 0.85,
        description: "You tend to skip Artist A frequently",
        relatedData: { artist: "Artist A", skipCount: 10 },
        firstDetected: "2023-01-15T12:30:00Z",
      },
      {
        id: "pattern2",
        type: "time_of_day",
        confidence: 0.92,
        description: "You skip more tracks in the evening",
        relatedData: { timeRange: "18:00-22:00", skipRate: 0.35 },
        firstDetected: "2023-02-10T18:45:00Z",
      },
    ];

    mockGetSkipPatterns.mockResolvedValue({
      success: true,
      data: mockPatterns,
    });

    render(<SkipPatternsTab loading={false} statistics={null} />);

    // Wait for the API call to complete
    await waitFor(() => {
      expect(mockGetSkipPatterns).toHaveBeenCalledTimes(1);
    });

    // Check for pattern type distribution title
    expect(screen.getByText("Pattern Type Distribution")).toBeInTheDocument();

    // Check for charts
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();

    // Test toggle between chart types
    const barChartToggle = screen.getByLabelText("Bar Chart");
    fireEvent.click(barChartToggle);

    // Now we should see the bar chart
    await waitFor(() => {
      expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    });
  });

  it("should handle pattern detection failure", async () => {
    mockGetSkipPatterns.mockResolvedValue({
      success: true,
      data: [], // Empty patterns array
    });

    mockTriggerAggregation.mockResolvedValue({
      success: false,
      message: "Failed to aggregate skip data",
    });

    render(<SkipPatternsTab loading={false} statistics={null} />);

    // Wait for the initial patterns load
    await waitFor(() => {
      expect(mockGetSkipPatterns).toHaveBeenCalledTimes(1);
    });

    // Click analyze button
    const analyzeButton = screen.getByText("Analyze Now");
    fireEvent.click(analyzeButton);

    // Wait for error state
    await waitFor(() => {
      expect(mockTriggerAggregation).toHaveBeenCalledTimes(1);
    });

    // Check for error message
    expect(screen.getByText("Error Loading Patterns")).toBeInTheDocument();
    expect(
      screen.getByText("Failed to aggregate skip data"),
    ).toBeInTheDocument();
  });
});
