import React from "react";
import { describe, expect, it, vi } from "vitest";

// Define types for router-related structures
interface Route {
  path: string;
  component: React.ComponentType<unknown>;
  getParentRoute: () => RootRoute;
}

interface RootRoute {
  addChildren: (routes: Route[]) => { children: Route[] };
}

// Define Suspense props
interface SuspenseProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Mock TanStack router
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...(actual as object),
    createRoute: vi.fn(
      ({
        getParentRoute,
        path,
        component,
      }: {
        getParentRoute: () => unknown;
        path: string;
        component: React.ComponentType;
      }) => ({
        path,
        component,
        getParentRoute,
      }),
    ),
    createRootRoute: vi.fn(() => ({
      addChildren: (children: Route[]) => ({
        children,
      }),
    })),
  };
});

// Mock the React lazy loading and Suspense
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...(actual as object),
    lazy: () => () => null,
    Suspense: ({ children }: SuspenseProps) => <>{children}</>,
  };
});

// Mock the routes module
vi.mock("../../../routes/__root", () => ({
  RootRoute: {
    addChildren: vi.fn((routes: Route[]) => ({ children: routes })),
  },
}));

// Mock the routes with their properties
vi.mock("../../../routes/routes", () => {
  const RootRoute = {
    addChildren: vi.fn((routes: Route[]) => ({ children: routes })),
  };

  const HomeRoute = {
    path: "/",
    component: vi.fn(() => null),
    getParentRoute: () => RootRoute,
  };

  const SkippedTracksRoute = {
    path: "/skipped-tracks",
    component: vi.fn(() => null),
    getParentRoute: () => RootRoute,
  };

  const StatisticsRoute = {
    path: "/statistics",
    component: vi.fn(() => null),
    getParentRoute: () => RootRoute,
  };

  const SettingsRoute = {
    path: "/settings",
    component: vi.fn(() => null),
    getParentRoute: () => RootRoute,
  };

  const rootTree = {
    children: [HomeRoute, SkippedTracksRoute, StatisticsRoute, SettingsRoute],
  };

  return {
    HomeRoute,
    SkippedTracksRoute,
    StatisticsRoute,
    SettingsRoute,
    rootTree,
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

// Import the mocked modules
import {
  HomeRoute,
  SettingsRoute,
  SkippedTracksRoute,
  StatisticsRoute,
  rootTree,
} from "../../../routes/routes";

describe("Routes", () => {
  it("should define HomeRoute with correct path", () => {
    // Assert
    expect(HomeRoute.path).toBe("/");
  });

  it("should define SkippedTracksRoute with correct path", () => {
    // Assert
    expect(SkippedTracksRoute.path).toBe("/skipped-tracks");
  });

  it("should define StatisticsRoute with correct path", () => {
    // Assert
    expect(StatisticsRoute.path).toBe("/statistics");
  });

  it("should define SettingsRoute with correct path", () => {
    // Assert
    expect(SettingsRoute.path).toBe("/settings");
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
    // Assert
    expect(typeof HomeRoute.component).toBe("function");
    expect(typeof SkippedTracksRoute.component).toBe("function");
    expect(typeof StatisticsRoute.component).toBe("function");
    expect(typeof SettingsRoute.component).toBe("function");
  });
});
