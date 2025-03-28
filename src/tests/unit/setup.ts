import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, describe, test, vi } from "vitest";

// Automatically clean up after each test
afterEach(() => {
  cleanup();
});

// Helper function to conditionally skip tests in CI environment
export const skipInCI = {
  // Use this to skip individual tests in CI
  // Usage: skipInCI.test("test name", () => { ... })
  test: (name: string, fn: () => void) => {
    const isCI =
      process.env.CI === "true" ||
      process.env.GITHUB_ACTIONS === "true" ||
      process.env.SKIP_PROBLEMATIC_TESTS === "true";
    return isCI ? test.skip(name, fn) : test(name, fn);
  },

  // Use this to skip entire describe blocks in CI
  // Usage: skipInCI.describe("describe name", () => { ... })
  describe: (name: string, fn: () => void) => {
    const isCI =
      process.env.CI === "true" ||
      process.env.GITHUB_ACTIONS === "true" ||
      process.env.SKIP_PROBLEMATIC_TESTS === "true";
    return isCI ? describe.skip(name, fn) : describe(name, fn);
  },

  // Use this as a conditional to skip logic inside tests
  // Usage: if (skipInCI.enabled) return;
  enabled:
    process.env.CI === "true" ||
    process.env.GITHUB_ACTIONS === "true" ||
    process.env.SKIP_PROBLEMATIC_TESTS === "true",
};

// Define type for window.electron
declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        send: (channel: string, ...args: unknown[]) => void;
        invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
        on: (channel: string, listener: (...args: unknown[]) => void) => void;
        removeListener: (
          channel: string,
          listener: (...args: unknown[]) => void,
        ) => void;
      };
    };
  }
}

// Global mocks for Electron features
global.window.electron = {
  // Mock IPC handler for Electron APIs
  ipcRenderer: {
    send: vi.fn(),
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
};

// Mock for react-hook-form's useFormContext
vi.mock("react-hook-form", async () => {
  const actual = await vi.importActual("react-hook-form");
  return {
    ...(actual as object),
    useFormContext: () => ({
      getFieldState: vi.fn(),
      formState: {
        errors: {},
        isDirty: false,
        isSubmitted: false,
        isSubmitSuccessful: false,
        isSubmitting: false,
        isValid: true,
        isValidating: false,
        submitCount: 0,
      },
      control: {
        _defaultValues: {},
        _fields: {},
        _formValues: {},
        _names: {
          mount: new Set(),
          unMount: new Set(),
          array: new Set(),
          watch: new Set(),
        },
        _getWatch: vi.fn(),
        _formState: {
          isDirty: false,
          isSubmitted: false,
          isSubmitSuccessful: false,
          isSubmitting: false,
          isValid: true,
          isValidating: false,
          submitCount: 0,
          errors: {},
        },
        _options: {
          mode: "onSubmit",
          reValidateMode: "onChange",
          shouldFocusError: true,
        },
        register: vi.fn(),
        unregister: vi.fn(),
        getFieldState: vi.fn(),
        handleSubmit: vi.fn(),
        setError: vi.fn(),
        clearErrors: vi.fn(),
        array: {
          append: vi.fn(),
          prepend: vi.fn(),
          insert: vi.fn(),
          swap: vi.fn(),
          move: vi.fn(),
          remove: vi.fn(),
          update: vi.fn(),
          replace: vi.fn(),
          fields: [],
        },
      },
      getValues: vi.fn().mockReturnValue({}),
      setValue: vi.fn(),
      watch: vi.fn(),
      register: vi.fn().mockImplementation((name) => ({
        name,
        onChange: vi.fn(),
        onBlur: vi.fn(),
        ref: vi.fn(),
      })),
      handleSubmit: vi.fn(() => vi.fn()),
      trigger: vi.fn(),
      clearErrors: vi.fn(),
      resetField: vi.fn(),
      setError: vi.fn(),
      reset: vi.fn(),
    }),
    useFormState: vi.fn().mockImplementation(() => ({
      isDirty: false,
      isSubmitted: false,
      isSubmitSuccessful: false,
      isSubmitting: false,
      isValid: true,
      isValidating: false,
      submitCount: 0,
      errors: {},
    })),
    useForm: vi.fn().mockReturnValue({
      register: vi.fn(),
      handleSubmit: vi.fn(() => vi.fn()),
      formState: { errors: {} },
      control: {
        _defaultValues: {},
        array: {
          append: vi.fn(),
          prepend: vi.fn(),
          insert: vi.fn(),
          swap: vi.fn(),
          move: vi.fn(),
          remove: vi.fn(),
          update: vi.fn(),
          replace: vi.fn(),
          fields: [],
        },
      },
      getValues: vi.fn().mockReturnValue({}),
      setValue: vi.fn(),
      reset: vi.fn(),
    }),
    FormProvider: ({ children }: { children: React.ReactNode }) => children,
    useController: vi.fn().mockReturnValue({
      field: {
        onChange: vi.fn(),
        onBlur: vi.fn(),
        value: "",
        name: "",
        ref: vi.fn(),
      },
      formState: { errors: {} },
    }),
    Controller: ({ render }: { render: any }) =>
      render({
        field: {
          onChange: vi.fn(),
          onBlur: vi.fn(),
          value: "",
          name: "",
          ref: vi.fn(),
        },
        fieldState: { error: null },
        formState: { errors: {} },
      }),
  };
});

// Mock for ResizeObserver which is used by @radix-ui components
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Add to global
global.ResizeObserver = ResizeObserverMock;
