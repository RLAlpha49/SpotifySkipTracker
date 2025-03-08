import type { UserConfig } from "vite";
import { defineConfig, mergeConfig } from "vite";
import { getBuildConfig, external, pluginHotRestart } from "./vite.base.config";

// Define interface for Electron Forge environment
interface ForgeEnv {
  forgeConfigSelf: {
    entry?: string;
  };
}

// https://vitejs.dev/config
export default defineConfig((env) => {
  // Type assertion to access Electron Forge properties
  const forgeEnv = env as unknown as ForgeEnv;
  const forgeConfigSelf = forgeEnv.forgeConfigSelf || {};

  const config: UserConfig = {
    build: {
      rollupOptions: {
        external,
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: forgeConfigSelf.entry || "",
        output: {
          format: "cjs",
          // It should not be split chunks.
          inlineDynamicImports: true,
          entryFileNames: "[name].js",
          chunkFileNames: "[name].js",
          assetFileNames: "[name].[ext]",
        },
      },
    },
    plugins: [pluginHotRestart("reload")],
  };

  return mergeConfig(getBuildConfig(env), config);
});
