import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RootRoute } from "../../../routes/__root";

// Mock dependencies
vi.mock("@tanstack/react-router", () => ({
  Outlet: () => <div data-testid="outlet">Outlet Content</div>,
  createRootRoute: vi.fn().mockImplementation(({ component }) => ({
    id: "root",
    component,
  })),
}));

vi.mock("../../../layouts/MainLayout", () => ({
  default: ({ children }: any) => (
    <div data-testid="main-layout">
      <div>Main Layout Wrapper</div>
      {children}
    </div>
  ),
}));

describe("Root Route", () => {
  it("should create a root route with a component", () => {
    // Assert
    expect(RootRoute).toBeDefined();
    expect(RootRoute.id).toBe("root");
    expect(RootRoute.component).toBeDefined();
  });

  it("should render the Root component with MainLayout and Outlet", () => {
    // Arrange & Act
    const Component = RootRoute.component;
    render(<Component />);

    // Assert
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
    expect(screen.getByText("Main Layout Wrapper")).toBeInTheDocument();
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
    expect(screen.getByText("Outlet Content")).toBeInTheDocument();
  });

  it("should wrap the Outlet in MainLayout", () => {
    // Arrange & Act
    const Component = RootRoute.component;
    render(<Component />);

    // Assert
    const mainLayout = screen.getByTestId("main-layout");
    const outlet = screen.getByTestId("outlet");
    expect(mainLayout).toContainElement(outlet);
  });
});
