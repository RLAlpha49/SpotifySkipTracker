import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DragWindowRegion from "../../../components/DragWindowRegion";
import * as windowHelpers from "../../../helpers/window_helpers";

// Mock the window helper functions
vi.mock("../../../helpers/window_helpers", () => ({
  minimizeWindow: vi.fn(),
  maximizeWindow: vi.fn(),
  closeWindow: vi.fn(),
}));

describe("DragWindowRegion Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render without a title", () => {
    const { container } = render(<DragWindowRegion />);

    // Verify draggable region exists using container query
    const dragLayer = container.querySelector(".draglayer");
    expect(dragLayer).toBeInTheDocument();

    // Verify window buttons exist
    expect(screen.getByTitle("Minimize")).toBeInTheDocument();
    expect(screen.getByTitle("Maximize")).toBeInTheDocument();
    expect(screen.getByTitle("Close")).toBeInTheDocument();
  });

  it("should render with a title", () => {
    const testTitle = "Test Window Title";
    render(<DragWindowRegion title={testTitle} />);

    // Verify title is displayed
    expect(screen.getByText(testTitle)).toBeInTheDocument();

    // Verify window buttons still exist
    expect(screen.getByTitle("Minimize")).toBeInTheDocument();
    expect(screen.getByTitle("Maximize")).toBeInTheDocument();
    expect(screen.getByTitle("Close")).toBeInTheDocument();
  });

  it("should call minimizeWindow when minimize button is clicked", () => {
    render(<DragWindowRegion />);

    // Click minimize button
    const minimizeButton = screen.getByTitle("Minimize");
    fireEvent.click(minimizeButton);

    // Verify function was called
    expect(windowHelpers.minimizeWindow).toHaveBeenCalledTimes(1);
  });

  it("should call maximizeWindow when maximize button is clicked", () => {
    render(<DragWindowRegion />);

    // Click maximize button
    const maximizeButton = screen.getByTitle("Maximize");
    fireEvent.click(maximizeButton);

    // Verify function was called
    expect(windowHelpers.maximizeWindow).toHaveBeenCalledTimes(1);
  });

  it("should call closeWindow when close button is clicked", () => {
    render(<DragWindowRegion />);

    // Click close button
    const closeButton = screen.getByTitle("Close");
    fireEvent.click(closeButton);

    // Verify function was called
    expect(windowHelpers.closeWindow).toHaveBeenCalledTimes(1);
  });

  it("should render with a React element as title", () => {
    const testElement = (
      <span data-testid="test-title-element">Custom Title</span>
    );
    render(<DragWindowRegion title={testElement} />);

    // Verify custom title element is rendered
    expect(screen.getByTestId("test-title-element")).toBeInTheDocument();
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
  });
});
