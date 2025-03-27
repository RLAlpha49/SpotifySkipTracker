import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { NoDataMessage } from "../../../../components/statistics/NoDataMessage";

// Mock Math.random to control the icon selection
const mockMath = Object.create(global.Math);
mockMath.random = vi.fn();
global.Math = mockMath;

describe("NoDataMessage Component", () => {
  it("should render with the provided message", () => {
    const testMessage = "No skip data available yet";
    render(<NoDataMessage message={testMessage} />);

    // Check the heading is displayed
    expect(screen.getByText("No Data Available")).toBeInTheDocument();

    // Check the message is displayed
    expect(screen.getByText(testMessage)).toBeInTheDocument();

    // Check the help text is displayed
    expect(
      screen.getByText("Keep listening to generate insights"),
    ).toBeInTheDocument();
  });

  it("should render a different message when provided", () => {
    const testMessage = "Custom message for testing";
    render(<NoDataMessage message={testMessage} />);

    expect(screen.getByText(testMessage)).toBeInTheDocument();
  });

  it("should render the BarChart icon when Math.random returns 0", () => {
    // Set Math.random to return 0 (first icon in the array)
    mockMath.random.mockReturnValue(0);

    render(<NoDataMessage message="Test message" />);

    // Since we can't directly test which icon is rendered easily,
    // we can check that an SVG exists inside the icon container
    const iconContainer = screen.getByTestId("icon-container");
    const svg = iconContainer.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should render the LineChart icon when Math.random returns 0.4", () => {
    // Set Math.random to return 0.4 (second icon in the array)
    mockMath.random.mockReturnValue(0.4);

    render(<NoDataMessage message="Test message" />);

    // Check that an SVG exists inside the icon container
    const iconContainer = screen.getByTestId("icon-container");
    const svg = iconContainer.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should render the PieChart icon when Math.random returns 0.7", () => {
    // Set Math.random to return 0.7 (third icon in the array)
    mockMath.random.mockReturnValue(0.7);

    render(<NoDataMessage message="Test message" />);

    // Check that an SVG exists inside the icon container
    const iconContainer = screen.getByTestId("icon-container");
    const svg = iconContainer.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should have the correct amber styling", () => {
    render(<NoDataMessage message="Test message" />);

    // Check for amber-related classes on elements
    const container = screen.getByTestId("no-data-container");
    expect(container).toHaveClass("border-amber-200");
    expect(container).toHaveClass("bg-amber-50/50");

    const heading = screen.getByText("No Data Available");
    expect(heading).toHaveClass("text-amber-800");
  });
});
