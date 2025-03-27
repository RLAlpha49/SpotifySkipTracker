import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MainLayout from "../../../layouts/MainLayout";

// Mock dependencies
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, className, onClick }: any) => (
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
  ScrollArea: ({ children }: any) => (
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
    ...(actual as any),
    lazy: (factory: any) => factory(),
    Suspense: ({ children }: any) => <>{children}</>,
  };
});

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
