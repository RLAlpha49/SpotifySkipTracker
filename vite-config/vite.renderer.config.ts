import path from "path";
import react from "@vitejs/plugin-react";
import type { UserConfig } from "vite";
import { defineConfig } from "vite";
import { pluginExposeRenderer } from "./vite.base.config";
import fs from "fs";

interface ForgeEnv {
  root: string;
  mode: string;
  forgeConfigSelf: {
    name?: string;
    entry?: string;
  };
}

// https://vitejs.dev/config
export default defineConfig((env) => {
  // Cast to unknown first to avoid type errors with Electron Forge's custom environment
  const forgeEnv = env as unknown as ForgeEnv;

  // Extract properties with individual type assertions
  const root = forgeEnv.root;
  const mode = forgeEnv.mode;
  const forgeConfigSelf = forgeEnv.forgeConfigSelf || {};
  const name = forgeConfigSelf.name || "";

  // Ensure index.html is available in production build directory
  const isProduction = mode === "production";
  if (isProduction) {
    const outputDir = `.vite/renderer/${name}`;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    // Copy index.html to ensure it's available in the build output
    fs.copyFileSync("index.html", path.join(outputDir, "index.html"));

    // Also copy to the root of the .vite directory for redundancy
    if (!fs.existsSync(".vite")) {
      fs.mkdirSync(".vite", { recursive: true });
    }
    fs.copyFileSync("index.html", path.join(".vite", "index.html"));
  }

  return {
    root,
    mode,
    base: "./",
    build: {
      outDir: `.vite/renderer/${name}`,
      assetsInlineLimit: 0,
      cssCodeSplit: false,
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, "../index.html"),
        },
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "chunks/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
          manualChunks: (id) => {
            // Form-related libraries
            if (
              id.includes("node_modules/react-hook-form") ||
              id.includes("node_modules/@hookform/resolvers") ||
              id.includes("node_modules/zod")
            ) {
              return "vendor-form-libs";
            }

            // UI framework
            if (
              id.includes("node_modules/@radix-ui") ||
              id.includes("node_modules/class-variance-authority") ||
              id.includes("node_modules/tailwind-merge") ||
              id.includes("node_modules/tailwindcss-animate") ||
              id.includes("node_modules/lucide-react")
            ) {
              return "vendor-ui-framework";
            }

            if (id.includes("node_modules")) {
              return "vendor";
            }

            // UI components
            if (id.includes("/components/ui/")) {
              return "app-ui-components";
            }

            // Utilities
            if (id.includes("/utils/") || id.includes("/helpers/")) {
              return "app-utils";
            }

            // Authentication and user-related features
            if (
              id.includes("/services/auth/") ||
              id.includes("/components/spotify/AuthenticationCard") ||
              id.includes("/helpers/theme_") ||
              id.includes("/components/ToggleTheme")
            ) {
              return "app-feature-user";
            }

            // Playback and monitoring features
            if (
              id.includes("/services/playback/") ||
              id.includes("/components/spotify/PlaybackMonitoringCard") ||
              id.includes("/components/spotify/NowPlayingCard") ||
              id.includes("/components/spotify/LogsCard")
            ) {
              return "app-feature-playback";
            }

            // Settings feature
            if (id.includes("/components/settings/")) {
              return "app-feature-settings";
            }

            // Skip tracking feature
            if (id.includes("/components/skippedTracks/")) {
              return "app-feature-skipped-tracks";
            }

            // Core API services
            if (id.includes("/services/")) {
              return "app-services";
            }

            // Pages and routes
            if (id.includes("/pages/") || id.includes("/routes/")) {
              return "app-pages";
            }

            // Application core
            return "app-core";
          },
        },
      },
    },
    plugins: [
      pluginExposeRenderer(name),
      react({
        babel: {
          plugins: [["babel-plugin-react-compiler"]],
        },
      }),
    ],
    resolve: {
      preserveSymlinks: true,
      alias: {
        "@": path.resolve(__dirname, "../src"),
      },
    },
    clearScreen: false,
  } as UserConfig;
});
