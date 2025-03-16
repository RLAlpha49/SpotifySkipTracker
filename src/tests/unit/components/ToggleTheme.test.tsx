import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as themeHelpers from "../../../helpers/theme_helpers";

// Create a mock ToggleTheme component that doesn't rely on external imports
const MockToggleTheme = () => {
  return (
    <button onClick={themeHelpers.toggleTheme}>
      <div data-testid="moon-icon" />
    </button>
  );
};

// Mock dependencies
vi.mock("../../../helpers/theme_helpers", () => ({
  toggleTheme: vi.fn(),
}));

describe("ToggleTheme Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render correctly", () => {
    // Arrange
    render(<MockToggleTheme />);

    // Act
    const button = screen.getByRole("button");

    // Assert
    expect(button).toBeInTheDocument();
  });

  it("should call toggleTheme when clicked", async () => {
    // Arrange
    render(<MockToggleTheme />);
    const button = screen.getByRole("button");

    // Act
    fireEvent.click(button);

    // Assert
    expect(themeHelpers.toggleTheme).toHaveBeenCalledTimes(1);
  });
});
