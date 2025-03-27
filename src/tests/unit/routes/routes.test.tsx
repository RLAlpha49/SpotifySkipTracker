import { describe, expect, it, vi } from "vitest";
import { RootRoute } from "../../../routes/__root";
import {
  HomeRoute,
  SettingsRoute,
  SkippedTracksRoute,
  StatisticsRoute,
  rootTree,
} from "../../../routes/routes";

// Mock the React lazy loading and Suspense
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...(actual as any),
    lazy: (factory: any) => () => null,
    Suspense: ({ children }: any) => <>{children}</>,
  };
});

// Mock the page components
vi.mock("../../../pages/HomePage", () => ({
  default: () => <div data-testid="home-page">Home Page</div>,
}));

vi.mock("../../../pages/SkippedTracksPage", () => ({
  default: () => (
    <div data-testid="skipped-tracks-page">Skipped Tracks Page</div>
  ),
}));

vi.mock("../../../pages/StatisticsPage", () => ({
  default: () => <div data-testid="statistics-page">Statistics Page</div>,
}));

vi.mock("../../../pages/SettingsPage", () => ({
  default: () => <div data-testid="settings-page">Settings Page</div>,
}));

vi.mock("@/components/ui/spinner", () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

describe("Routes", () => {
  it("should define HomeRoute with correct path", () => {
    // Assert
    expect(HomeRoute.path).toBe("/");
    expect(HomeRoute.getParentRoute()).toBe(RootRoute);
  });

  it("should define SkippedTracksRoute with correct path", () => {
    // Assert
    expect(SkippedTracksRoute.path).toBe("/skipped-tracks");
    expect(SkippedTracksRoute.getParentRoute()).toBe(RootRoute);
  });

  it("should define StatisticsRoute with correct path", () => {
    // Assert
    expect(StatisticsRoute.path).toBe("/statistics");
    expect(StatisticsRoute.getParentRoute()).toBe(RootRoute);
  });

  it("should define SettingsRoute with correct path", () => {
    // Assert
    expect(SettingsRoute.path).toBe("/settings");
    expect(SettingsRoute.getParentRoute()).toBe(RootRoute);
  });

  it("should include all routes in the rootTree", () => {
    // Assert
    const routePaths = rootTree.children?.map((route) => route.path);
    expect(routePaths).toContain("/");
    expect(routePaths).toContain("/skipped-tracks");
    expect(routePaths).toContain("/statistics");
    expect(routePaths).toContain("/settings");
    expect(rootTree.children?.length).toBe(4);
  });

  // Test route components
  it("should render route components with Suspense", () => {
    // Note: We can't easily test the actual rendering without a more complex setup
    // with React Testing Library and a router provider. This test checks that
    // the component property exists and is a function.

    // Assert
    expect(typeof HomeRoute.component).toBe("function");
    expect(typeof SkippedTracksRoute.component).toBe("function");
    expect(typeof StatisticsRoute.component).toBe("function");
    expect(typeof SettingsRoute.component).toBe("function");
  });
});
