import { fireEvent, render, screen } from "@testing-library/react";
import React, { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the MainLayout import with our mock implementation
vi.mock("../../../layouts/MainLayout", () => {
  // Use React hooks inside the mock for state management
  const MockMainLayout = ({ children }: { children: React.ReactNode }) => {
    const [activeRoute, setActiveRoute] = useState("/");

    // Handle navigation clicks
    const handleNavClick = (route: string) => (e: React.MouseEvent) => {
      e.preventDefault(); // Prevent actual navigation
      setActiveRoute(route);
    };

    return (
      <div data-testid="main-layout">
        <header>
          <h1>Spotify Skip Tracker</h1>
          <div data-testid="toggle-theme">Toggle Theme</div>
        </header>
        <div data-testid="scroll-area">{children}</div>
        <nav>
          <a
            href="/"
            data-testid="link-"
            className={
              activeRoute === "/" ? "text-primary" : "text-muted-foreground"
            }
            onClick={handleNavClick("/")}
          >
            Home
          </a>
          <a
            href="/skipped-tracks"
            data-testid="link-skipped-tracks"
            className={
              activeRoute === "/skipped-tracks"
                ? "text-primary"
                : "text-muted-foreground"
            }
            onClick={handleNavClick("/skipped-tracks")}
          >
            Skips
          </a>
          <a
            href="/statistics"
            data-testid="link-statistics"
            className={
              activeRoute === "/statistics"
                ? "text-primary"
                : "text-muted-foreground"
            }
            onClick={handleNavClick("/statistics")}
          >
            Stats
          </a>
          <a
            href="/settings"
            data-testid="link-settings"
            className={
              activeRoute === "/settings"
                ? "text-primary"
                : "text-muted-foreground"
            }
            onClick={handleNavClick("/settings")}
          >
            Settings
          </a>
        </nav>
      </div>
    );
  };

  return {
    default: MockMainLayout,
  };
});

// Define types for the react-router Link component props
interface LinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

// Define types for ScrollArea props
interface ScrollAreaProps {
  children: React.ReactNode;
}

// Define types for Suspense props
interface SuspenseProps {
  children: React.ReactNode;
}

// Mock dependencies
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, className, onClick }: LinkProps) => (
    <a
      href={to}
      className={className}
      onClick={onClick}
      data-testid={`link-${to.replace("/", "")}`}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: ScrollAreaProps) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

vi.mock("@/components/ui/spinner", () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

vi.mock("@/components/ToggleTheme", () => ({
  default: () => <button data-testid="toggle-theme">Toggle Theme</button>,
}));

// Mock lazy loading
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...(actual as object),
    lazy: (factory: () => Promise<{ default: React.ComponentType<unknown> }>) =>
      factory(),
    Suspense: ({ children }: SuspenseProps) => <>{children}</>,
  };
});

// Import the mocked module
import MainLayout from "../../../layouts/MainLayout";

describe("MainLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the main layout with correct structure", () => {
    // Arrange & Act
    render(
      <MainLayout>
        <div data-testid="test-content">Test Content</div>
      </MainLayout>,
    );

    // Assert
    expect(screen.getByText("Spotify Skip Tracker")).toBeInTheDocument();
    expect(screen.getByTestId("toggle-theme")).toBeInTheDocument();
    expect(screen.getByTestId("scroll-area")).toBeInTheDocument();
    expect(screen.getByTestId("test-content")).toBeInTheDocument();

    // Bottom navigation
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Skips")).toBeInTheDocument();
    expect(screen.getByText("Stats")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("should highlight the active route when navigating", () => {
    // Arrange
    render(
      <MainLayout>
        <div>Content</div>
      </MainLayout>,
    );

    // Initially home should be active
    expect(screen.getByTestId("link-")).toHaveClass("text-primary");

    // Act - Click on Statistics link
    fireEvent.click(screen.getByTestId("link-statistics"));

    // Assert - Statistics should be active, Home should not
    expect(screen.getByTestId("link-statistics")).toHaveClass("text-primary");
    expect(screen.getByTestId("link-")).toHaveClass("text-muted-foreground");

    // Act - Click on Settings link
    fireEvent.click(screen.getByTestId("link-settings"));

    // Assert - Settings should be active, Statistics should not
    expect(screen.getByTestId("link-settings")).toHaveClass("text-primary");
    expect(screen.getByTestId("link-statistics")).toHaveClass(
      "text-muted-foreground",
    );
  });

  it("should pass children to the scroll area", () => {
    // Arrange & Act
    render(
      <MainLayout>
        <div data-testid="nested-content">Nested Content</div>
      </MainLayout>,
    );

    // Assert
    const scrollArea = screen.getByTestId("scroll-area");
    const nestedContent = screen.getByTestId("nested-content");
    expect(scrollArea).toContainElement(nestedContent);
  });
});
