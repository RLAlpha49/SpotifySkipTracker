import { describe, expect, it, vi } from "vitest";
import { router } from "../../../routes/router";

// Mock TanStack Router
vi.mock("@tanstack/react-router", () => {
  const mockHistory = {
    navigate: vi.fn(),
    current: "/",
  };

  return {
    createMemoryHistory: vi.fn().mockReturnValue(mockHistory),
    createRouter: vi.fn().mockImplementation(({ routeTree, history }) => ({
      routeTree,
      history,
      navigate: vi.fn(),
      current: "/",
      mount: vi.fn(),
    })),
  };
});

// Mock the routes
vi.mock("../../../routes/routes", () => ({
  rootTree: {
    id: "root",
    children: [
      { id: "home", path: "/" },
      { id: "skipped-tracks", path: "/skipped-tracks" },
      { id: "statistics", path: "/statistics" },
      { id: "settings", path: "/settings" },
    ],
  },
}));

describe("Router", () => {
  it("should create a router with memory history", () => {
    // Assert
    expect(router).toBeDefined();
    expect(router.history).toBeDefined();
  });

  it("should initialize with the root tree", () => {
    // Assert
    expect(router.routeTree).toBeDefined();
    expect(router.routeTree.id).toBe("root");
    expect(router.routeTree.children?.length).toBe(4);
  });

  it("should have navigation methods", () => {
    // Assert
    expect(router.navigate).toBeDefined();
    expect(typeof router.navigate).toBe("function");
  });

  it("should have mount method", () => {
    // Assert
    expect(router.mount).toBeDefined();
    expect(typeof router.mount).toBe("function");
  });
});
