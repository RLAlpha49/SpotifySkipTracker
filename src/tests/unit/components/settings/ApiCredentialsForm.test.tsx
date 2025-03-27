import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { ApiCredentialsForm } from "../../../../components/settings/ApiCredentialsForm";

// Setup mock functions for control and onChange
const mockControl = {
  control: {},
  formState: { errors: {} },
};

const mockSetSettingsChanged = vi.fn();

describe("ApiCredentialsForm Component", () => {
  const setupTest = () => {
    return render(
      <ApiCredentialsForm
        form={mockControl as any}
        setSettingsChanged={mockSetSettingsChanged}
      />,
    );
  };

  beforeEach(() => {
    mockSetSettingsChanged.mockReset();
  });

  it("renders form with correct headings", () => {
    setupTest();

    // Check for heading
    expect(screen.getByText("Spotify API Credentials")).toBeInTheDocument();

    // Check for Spotify Developer Dashboard link
    const dashboardLink = screen.getByText("Spotify Developer Dashboard");
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink.getAttribute("href")).toBe(
      "https://developer.spotify.com/dashboard",
    );
  });

  it("renders tooltips with helpful information", () => {
    const { container } = setupTest();

    // Check for help icons using the lucide-circle-help class directly in the DOM
    const helpIcons = container.querySelectorAll(".lucide-circle-help");
    expect(helpIcons.length).toBeGreaterThan(0);
  });

  it("calls setSettingsChanged when input values change", () => {
    setupTest();

    // Find Client ID input field
    const clientIdInput = screen.getByLabelText(/Client ID/i);
    expect(clientIdInput).toBeInTheDocument();

    // Trigger input change
    fireEvent.change(clientIdInput, { target: { value: "new-client-id" } });

    // Check if setSettingsChanged was called
    expect(mockSetSettingsChanged).toHaveBeenCalledWith(true);
  });
});
