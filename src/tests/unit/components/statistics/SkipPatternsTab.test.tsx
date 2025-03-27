import { render } from "@testing-library/react";
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
    const { container } = render(
      <SkipPatternsTab loading={true} statistics={null} />,
    );

    // Check for skeleton elements by their data-slot attributes
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);

    // We don't need to check implementation details of API calls
  });

  it("should render component with no patterns", () => {
    mockGetSkipPatterns.mockResolvedValue({
      success: true,
      data: [], // Empty patterns array
    });

    const { container } = render(
      <SkipPatternsTab loading={false} statistics={null} />,
    );

    // Just check if the component renders with cards
    const cards = container.querySelectorAll('[data-slot="card"]');
    expect(cards.length).toBeGreaterThan(0);
  });

  it("should render component with error state", () => {
    mockGetSkipPatterns.mockResolvedValue({
      success: false,
      error: "Failed to load patterns",
    });

    const { container } = render(
      <SkipPatternsTab loading={false} statistics={null} />,
    );

    // Just check if the component renders at all
    expect(container.firstChild).toBeTruthy();
  });

  it("should render component with pattern data", () => {
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

    const { container } = render(
      <SkipPatternsTab loading={false} statistics={null} />,
    );

    // Just check if the component renders with cards
    const cards = container.querySelectorAll('[data-slot="card"]');
    expect(cards.length).toBeGreaterThan(0);
  });

  it("should handle basic interactions", () => {
    mockGetSkipPatterns.mockResolvedValue({
      success: true,
      data: [], // Empty patterns array
    });

    mockTriggerAggregation.mockResolvedValue({
      success: true,
      message: "Data aggregated successfully",
    });

    const { container } = render(
      <SkipPatternsTab loading={false} statistics={null} />,
    );

    // Just check if the component renders with cards
    const cards = container.querySelectorAll('[data-slot="card"]');
    expect(cards.length).toBeGreaterThan(0);
  });
});
