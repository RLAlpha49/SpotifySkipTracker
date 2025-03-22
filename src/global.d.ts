import { SpotifyAPI } from "./helpers/ipc/context-exposer";

declare global {
  interface Window {
    spotify: SpotifyAPI & {
      openURL: (url: string) => Promise<void>;
    };
    electronWindow: {
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
    };
    theme: {
      setTheme: (theme: string) => void;
      getTheme: () => string;
    };
  }
}

// This export is necessary for TypeScript to recognize this as a module
export {};
