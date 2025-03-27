import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthenticationCard } from "../../../../components/spotify/AuthenticationCard";

describe("AuthenticationCard Component", () => {
  // Mock functions for props
  const mockLogin = vi.fn().mockResolvedValue(undefined);
  const mockLogout = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render authenticated state correctly", () => {
    render(
      <AuthenticationCard
        isAuthenticated={true}
        needsReauthentication={false}
        onLogin={mockLogin}
        onLogout={mockLogout}
      />,
    );

    // Check if authenticated message is shown
    expect(screen.getByText("Connected to Spotify")).toBeInTheDocument();

    // Check if authenticated badge is shown
    expect(screen.getByText("Authenticated")).toBeInTheDocument();

    // Check if logout button is shown
    const logoutButton = screen.getByRole("button", { name: /logout/i });
    expect(logoutButton).toBeInTheDocument();
  });

  it("should render unauthenticated state correctly", () => {
    render(
      <AuthenticationCard
        isAuthenticated={false}
        needsReauthentication={false}
        onLogin={mockLogin}
        onLogout={mockLogout}
      />,
    );

    // Check if unauthenticated message is shown
    expect(screen.getByText("Not connected to Spotify")).toBeInTheDocument();

    // Check if unauthenticated badge is shown
    expect(screen.getByText("Not Authenticated")).toBeInTheDocument();

    // Check if login button is shown
    const loginButton = screen.getByRole("button", {
      name: /login with spotify/i,
    });
    expect(loginButton).toBeInTheDocument();

    // Check if appropriate message for new user is shown
    expect(
      screen.getByText(
        "Connect to Spotify to use playback monitoring and controls.",
      ),
    ).toBeInTheDocument();
  });

  it("should render reauthentication state correctly", () => {
    render(
      <AuthenticationCard
        isAuthenticated={false}
        needsReauthentication={true}
        onLogin={mockLogin}
        onLogout={mockLogout}
      />,
    );

    // Check if the reauthentication message is shown
    expect(
      screen.getByText(
        "You've logged out. Click Login to authenticate with Spotify.",
      ),
    ).toBeInTheDocument();
  });

  it("should call onLogin when login button is clicked", async () => {
    render(
      <AuthenticationCard
        isAuthenticated={false}
        needsReauthentication={false}
        onLogin={mockLogin}
        onLogout={mockLogout}
      />,
    );

    // Click the login button
    const loginButton = screen.getByRole("button", {
      name: /login with spotify/i,
    });
    fireEvent.click(loginButton);

    // Check if login function was called
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it("should call onLogout when logout button is clicked", async () => {
    render(
      <AuthenticationCard
        isAuthenticated={true}
        needsReauthentication={false}
        onLogin={mockLogin}
        onLogout={mockLogout}
      />,
    );

    // Click the logout button
    const logoutButton = screen.getByRole("button", { name: /logout/i });
    fireEvent.click(logoutButton);

    // Check if logout function was called
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
