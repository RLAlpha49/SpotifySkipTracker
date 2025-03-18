import { builtinModules } from "node:module";
import type { AddressInfo } from "node:net";
import type { ConfigEnv, Plugin, UserConfig } from "vite";
import pkg from "../package.json";

// Define runtime keys interface
interface VitePluginRuntimeKeys {
  VITE_DEV_SERVER_URL: string;
  VITE_NAME: string;
}

// Declare process.viteDevServers for TypeScript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let process: NodeJS.Process & { viteDevServers?: Record<string, any> };

export const builtins = [
  "electron",
  ...builtinModules.map((m) => [m, `node:${m}`]).flat(),
];

// Define dependencies that should be bundled, not externalized
export const bundledDependencies = ["axios"];

export const external = [
  ...builtins,
  ...Object.keys(
    "dependencies" in pkg ? (pkg.dependencies as Record<string, unknown>) : {},
  ).filter((dep) => !bundledDependencies.includes(dep)), // Exclude bundled dependencies
];

export function getBuildConfig(env: ConfigEnv): UserConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { root, mode, command } = env as any;

  return {
    root,
    mode,
    build: {
      // Prevent multiple builds from interfering with each other.
      emptyOutDir: false,
      // 🚧 Multiple builds may conflict.
      outDir: ".vite/build",
      watch: command === "serve" ? {} : null,
      minify: command === "build",
    },
    clearScreen: false,
  };
}

export function getDefineKeys(names: string[]) {
  const define: { [name: string]: VitePluginRuntimeKeys } = {};

  return names.reduce((acc, name) => {
    const NAME = name.toUpperCase();
    const keys: VitePluginRuntimeKeys = {
      VITE_DEV_SERVER_URL: `${NAME}_VITE_DEV_SERVER_URL`,
      VITE_NAME: `${NAME}_VITE_NAME`,
    };

    return { ...acc, [name]: keys };
  }, define);
}

export function getBuildDefine(env: ConfigEnv) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { command, forgeConfig } = env as any;

  // Default to empty array if renderer is undefined
  const renderers = forgeConfig?.renderer || [];
  const names = renderers
    .filter(({ name }: { name?: string }) => name != null)
    .map(({ name }: { name?: string }) => name!);

  const defineKeys = getDefineKeys(names);
  const define = Object.entries(defineKeys).reduce(
    (acc, [name, keys]) => {
      const { VITE_DEV_SERVER_URL, VITE_NAME } = keys;
      const def = {
        [VITE_DEV_SERVER_URL]:
          command === "serve"
            ? JSON.stringify(process.env[VITE_DEV_SERVER_URL])
            : undefined,
        [VITE_NAME]: JSON.stringify(name),
      };
      return { ...acc, ...def };
    },
    {} as Record<string, unknown>,
  );

  return define;
}

export function pluginExposeRenderer(name: string): Plugin {
  const { VITE_DEV_SERVER_URL } = getDefineKeys([name])[name];

  return {
    name: "@electron-forge/plugin-vite:expose-renderer",
    configureServer(server) {
      process.viteDevServers ??= {};
      // Expose server for preload scripts hot reload.
      process.viteDevServers[name] = server;

      server.httpServer?.once("listening", () => {
        const addressInfo = server.httpServer!.address() as AddressInfo;
        // Expose env constant for main process use.
        process.env[VITE_DEV_SERVER_URL] =
          `http://localhost:${addressInfo?.port}`;
      });
    },
  };
}

export function pluginHotRestart(command: "reload" | "restart"): Plugin {
  return {
    name: "@electron-forge/plugin-vite:hot-restart",
    closeBundle() {
      if (command === "reload") {
        if (process.viteDevServers) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const server of Object.values(process.viteDevServers) as any[]) {
            // Preload scripts hot reload.
            server.ws.send({ type: "full-reload" });
          }
        }
      } else {
        // Main process hot restart.
        // https://github.com/electron/forge/blob/v7.2.0/packages/api/core/src/api/start.ts#L216-L223
        process.stdin.emit("data", "rs");
      }
    },
  };
}
