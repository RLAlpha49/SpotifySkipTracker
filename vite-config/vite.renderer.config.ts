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
          index: path.resolve(__dirname, "index.html"),
        },
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "[name].js",
          assetFileNames: "[name].[ext]",
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
