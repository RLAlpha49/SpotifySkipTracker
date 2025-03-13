import type { UserConfig } from "vite";
import { defineConfig, mergeConfig } from "vite";
import {
  getBuildConfig,
  getBuildDefine,
  external,
  pluginHotRestart,
} from "./vite.base.config";

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
  const define = getBuildDefine(env);

  const config: UserConfig = {
    build: {
      lib: {
        entry: forgeConfigSelf.entry || "",
        fileName: () => "[name].js",
        formats: ["cjs"],
      },
      rollupOptions: {
        external,
      },
    },
    plugins: [pluginHotRestart("restart")],
    define,
    resolve: {
      // Load the Node.js entry.
      mainFields: ["module", "jsnext:main", "jsnext"],
    },
  };

  return mergeConfig(getBuildConfig(env), config);
});
