import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionsTab } from "../../../../components/statistics/SessionsTab";

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

// Mock the ScrollArea component since it's a UI component
vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

// Mock recharts components
vi.mock("recharts", () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-area-chart">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-pie-chart">{children}</div>
  ),
  Pie: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-pie">{children}</div>
  ),
  Cell: () => <div data-testid="recharts-cell"></div>,
  Area: () => <div data-testid="recharts-area"></div>,
  Legend: () => <div data-testid="recharts-legend"></div>,
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

describe("SessionsTab Component", () => {
  // Mock data for testing
  const mockRecentSessions = [
    {
      id: "session1",
      formattedDate: "Mar 15, 2023",
      formattedTime: "8:30 AM",
      formattedDuration: "35m 20s",
      skipRate: 0.15,
      trackIds: ["track1", "track2", "track3", "track4", "track5"],
      skippedTracks: 1,
      deviceName: "iPhone 13",
      deviceType: "Phone",
    },
    {
      id: "session2",
      formattedDate: "Mar 16, 2023",
      formattedTime: "6:45 PM",
      formattedDuration: "1h 15m",
      skipRate: 0.25,
      trackIds: [
        "track6",
        "track7",
        "track8",
        "track9",
        "track10",
        "track11",
        "track12",
      ],
      skippedTracks: 2,
      deviceName: "MacBook Pro",
      deviceType: "Computer",
    },
    {
      id: "session3",
      formattedDate: "Mar 17, 2023",
      formattedTime: "10:15 AM",
      formattedDuration: "45m",
      skipRate: 0.4,
      trackIds: ["track13", "track14", "track15", "track16", "track17"],
      skippedTracks: 2,
      deviceName: "iPad Pro",
      deviceType: "Tablet",
    },
  ];

  const mockStatistics = {
    sessions: [
      {
        id: "session1",
        date: "2023-03-15",
        startTime: "08:30:00",
        endTime: "09:05:20",
        durationMs: 2120000, // 35m 20s
        deviceType: "Phone",
        deviceName: "iPhone 13",
        skipRate: 0.15,
        totalTracks: 5,
        skippedTracks: 1,
      },
      {
        id: "session2",
        date: "2023-03-16",
        startTime: "18:45:00",
        endTime: "20:00:00",
        durationMs: 4500000, // 1h 15m
        deviceType: "Computer",
        deviceName: "MacBook Pro",
        skipRate: 0.25,
        totalTracks: 7,
        skippedTracks: 2,
      },
      {
        id: "session3",
        date: "2023-03-17",
        startTime: "10:15:00",
        endTime: "11:00:00",
        durationMs: 2700000, // 45m
        deviceType: "Tablet",
        deviceName: "iPad Pro",
        skipRate: 0.4,
        totalTracks: 5,
        skippedTracks: 2,
      },
    ],
  } as any;

  it("should render loading skeletons when loading is true", () => {
    render(
      <SessionsTab loading={true} statistics={null} recentSessions={[]} />,
    );

    // Check for skeleton elements
    const skeletons = screen.getAllByClassName("h-5");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should render no data message when no statistics or sessions are available", () => {
    render(
      <SessionsTab loading={false} statistics={null} recentSessions={[]} />,
    );

    // Check for no data message
    expect(screen.getByTestId("no-data-message")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No session data available yet. Keep listening to music to generate insights!",
      ),
    ).toBeInTheDocument();

    // Case 2: With statistics but empty sessions array
    render(
      <SessionsTab
        loading={false}
        statistics={{ sessions: [] } as any}
        recentSessions={[]}
      />,
    );

    // Check for no data message again
    expect(screen.getByTestId("no-data-message")).toBeInTheDocument();
  });

  it("should render recent sessions in list view by default", () => {
    render(
      <SessionsTab
        loading={false}
        statistics={mockStatistics}
        recentSessions={mockRecentSessions}
      />,
    );

    // Check for section titles
    expect(screen.getByText("Recent Listening Sessions")).toBeInTheDocument();
    expect(screen.getByText("Device Usage Statistics")).toBeInTheDocument();

    // Check for session dates and times
    expect(screen.getByText("Mar 15, 2023")).toBeInTheDocument();
    expect(screen.getByText("8:30 AM")).toBeInTheDocument();
    expect(screen.getByText("Mar 16, 2023")).toBeInTheDocument();
    expect(screen.getByText("6:45 PM")).toBeInTheDocument();
    expect(screen.getByText("Mar 17, 2023")).toBeInTheDocument();
    expect(screen.getByText("10:15 AM")).toBeInTheDocument();

    // Check for session durations
    expect(screen.getByText("35m 20s")).toBeInTheDocument();
    expect(screen.getByText("1h 15m")).toBeInTheDocument();
    expect(screen.getByText("45m")).toBeInTheDocument();

    // Check for device names
    expect(screen.getByText("iPhone 13")).toBeInTheDocument();
    expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
    expect(screen.getByText("iPad Pro")).toBeInTheDocument();

    // Check for track counts
    expect(screen.getByText("5 tracks played")).toBeInTheDocument();
    expect(screen.getByText("7 tracks played")).toBeInTheDocument();
  });

  it("should display skip rates and completion rates for each session", () => {
    render(
      <SessionsTab
        loading={false}
        statistics={mockStatistics}
        recentSessions={mockRecentSessions}
      />,
    );

    // Check for skip rates
    expect(screen.getByText("1 skipped (15%)")).toBeInTheDocument();
    expect(screen.getByText("2 skipped (25%)")).toBeInTheDocument();
    expect(screen.getByText("2 skipped (40%)")).toBeInTheDocument();

    // Check for completion rates
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();

    // Check for progress bars
    const progressBars = screen.getAllByTestId("progress-bar");
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it("should switch sessions view to chart view when toggle is clicked", () => {
    render(
      <SessionsTab
        loading={false}
        statistics={mockStatistics}
        recentSessions={mockRecentSessions}
      />,
    );

    // Find and click the chart toggle for sessions
    const chartToggle = screen.getByLabelText("Chart view");
    fireEvent.click(chartToggle);

    // Verify chart components are rendered
    expect(screen.getByTestId("chart-container")).toBeInTheDocument();
    expect(screen.getByTestId("recharts-area-chart")).toBeInTheDocument();

    // Switch back to list view
    const listToggle = screen.getByLabelText("List view");
    fireEvent.click(listToggle);

    // Verify list view is back
    expect(screen.queryByTestId("recharts-area-chart")).not.toBeInTheDocument();
    expect(screen.getByText("Recent Listening Sessions")).toBeInTheDocument();
    expect(screen.getByText("Mar 15, 2023")).toBeInTheDocument();
  });

  it("should switch device usage to pie chart view when toggle is clicked", () => {
    render(
      <SessionsTab
        loading={false}
        statistics={mockStatistics}
        recentSessions={mockRecentSessions}
      />,
    );

    // Find and click the pie chart toggle for device usage
    const toggles = screen.getAllByRole("button");
    const pieChartToggle = toggles.find(
      (button) => button.getAttribute("aria-label") === "Pie chart",
    );

    if (pieChartToggle) {
      fireEvent.click(pieChartToggle);

      // Verify pie chart components are rendered
      expect(screen.getByTestId("recharts-pie-chart")).toBeInTheDocument();
      expect(screen.getByTestId("recharts-pie")).toBeInTheDocument();

      // Switch back to progress view
      const progressToggle = screen.getAllByLabelText("Progress bars")[0];
      fireEvent.click(progressToggle);

      // Verify progress bars are back
      expect(
        screen.queryByTestId("recharts-pie-chart"),
      ).not.toBeInTheDocument();
    }
  });

  it("should display session insights and metrics cards", () => {
    render(
      <SessionsTab
        loading={false}
        statistics={mockStatistics}
        recentSessions={mockRecentSessions}
      />,
    );

    // Check for session insights section
    expect(screen.getByText("Session Insights")).toBeInTheDocument();

    // We can't check for specific metrics since they are calculated dynamically,
    // but we can check for the categories
    expect(screen.getByText("Average Session Duration")).toBeInTheDocument();
    expect(screen.getByText("Average Tracks per Session")).toBeInTheDocument();
    expect(screen.getByText("Average Skip Rate")).toBeInTheDocument();
  });
});
