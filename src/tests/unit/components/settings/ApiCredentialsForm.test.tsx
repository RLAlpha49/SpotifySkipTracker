import { zodResolver } from "@hookform/resolvers/zod";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import * as z from "zod";
import { ApiCredentialsForm } from "../../../../components/settings/ApiCredentialsForm";
import { settingsFormSchema } from "../../../../components/settings/settingsFormSchema";

// Create a wrapper component to provide the form context
function FormWrapper({
  children,
  defaultValues,
  setSettingsChanged,
}: {
  children: React.ReactNode;
  defaultValues?: Partial<z.infer<typeof settingsFormSchema>>;
  setSettingsChanged: (changed: boolean) => void;
}) {
  const form = useForm<z.infer<typeof settingsFormSchema>>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      clientId: "",
      clientSecret: "",
      redirectUri: "",
      fileLogLevel: "INFO",
      logLineCount: 500,
      maxLogFiles: 10,
      logRetentionDays: 30,
      skipThreshold: 3,
      timeframeInDays: 30,
      autoStartMonitoring: true,
      autoUnlike: true,
      pollingInterval: 1000,
      ...defaultValues,
    },
  });

  return React.cloneElement(children as React.ReactElement, { form });
}

describe("ApiCredentialsForm Component", () => {
  const mockSetSettingsChanged = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the form with empty fields", () => {
    render(
      <FormWrapper setSettingsChanged={mockSetSettingsChanged}>
        <ApiCredentialsForm setSettingsChanged={mockSetSettingsChanged} />
      </FormWrapper>,
    );

    // Check if the component renders the title
    expect(screen.getByText("Spotify API Credentials")).toBeInTheDocument();

    // Check if the form fields are rendered
    expect(screen.getByText("Client ID")).toBeInTheDocument();
    expect(screen.getByText("Client Secret")).toBeInTheDocument();
    expect(screen.getByText("Redirect URI")).toBeInTheDocument();

    // Check if the description text is present
    expect(
      screen.getByText(
        "Enter your Spotify Developer credentials. You can get these from the",
      ),
    ).toBeInTheDocument();

    // Check if the link to Spotify Developer Dashboard is present
    const dashboardLink = screen.getByText("Spotify Developer Dashboard");
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink.getAttribute("href")).toBe(
      "https://developer.spotify.com/dashboard",
    );
  });

  it("should render form with pre-filled values", () => {
    const defaultValues = {
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
      redirectUri: "http://localhost:8888/callback",
    };

    render(
      <FormWrapper
        defaultValues={defaultValues}
        setSettingsChanged={mockSetSettingsChanged}
      >
        <ApiCredentialsForm setSettingsChanged={mockSetSettingsChanged} />
      </FormWrapper>,
    );

    // Check if the input fields have the pre-filled values
    const clientIdInput = screen.getByPlaceholderText(
      "Spotify Client ID",
    ) as HTMLInputElement;
    expect(clientIdInput.value).toBe(defaultValues.clientId);

    const clientSecretInput = screen.getByPlaceholderText(
      "Spotify Client Secret",
    ) as HTMLInputElement;
    expect(clientSecretInput.value).toBe(defaultValues.clientSecret);

    const redirectUriInput = screen.getByPlaceholderText(
      "http://localhost:8888/callback",
    ) as HTMLInputElement;
    expect(redirectUriInput.value).toBe(defaultValues.redirectUri);
  });

  it("should call setSettingsChanged when input values change", () => {
    render(
      <FormWrapper setSettingsChanged={mockSetSettingsChanged}>
        <ApiCredentialsForm setSettingsChanged={mockSetSettingsChanged} />
      </FormWrapper>,
    );

    // Change values in the input fields
    const clientIdInput = screen.getByPlaceholderText("Spotify Client ID");
    fireEvent.change(clientIdInput, { target: { value: "new-client-id" } });
    expect(mockSetSettingsChanged).toHaveBeenCalledWith(true);

    // Reset mock counter
    mockSetSettingsChanged.mockClear();

    const clientSecretInput = screen.getByPlaceholderText(
      "Spotify Client Secret",
    );
    fireEvent.change(clientSecretInput, {
      target: { value: "new-client-secret" },
    });
    expect(mockSetSettingsChanged).toHaveBeenCalledWith(true);

    // Reset mock counter
    mockSetSettingsChanged.mockClear();

    const redirectUriInput = screen.getByPlaceholderText(
      "http://localhost:8888/callback",
    );
    fireEvent.change(redirectUriInput, {
      target: { value: "http://new-redirect" },
    });
    expect(mockSetSettingsChanged).toHaveBeenCalledWith(true);
  });

  it("should display tooltips with helpful information", async () => {
    render(
      <FormWrapper setSettingsChanged={mockSetSettingsChanged}>
        <ApiCredentialsForm setSettingsChanged={mockSetSettingsChanged} />
      </FormWrapper>,
    );

    // Get all help icons (tooltips)
    const helpIcons = screen.getAllByTestId("help-circle");
    expect(helpIcons.length).toBe(3); // One for each field

    // Hover over the Client ID help icon to show tooltip
    fireEvent.mouseOver(helpIcons[0]);

    // Check if tooltip content is displayed (this may require waiting for it to appear)
    await screen.findByText(
      "The public identifier for your Spotify application.",
    );
  });
});
