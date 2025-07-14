import type { StorybookConfig } from "@storybook/nextjs";
import { resolve } from "path";

const config: StorybookConfig = {
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  stories: ["../stories/**/*.stories.@(tsx|mdx)"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-interactions"],
  webpackFinal: async (cfg) => {
    // Configure module resolution to resolve monorepo packages
    cfg.resolve!.alias = {
      ...(cfg.resolve!.alias ?? {}),
      "@copilotkit/react": resolve(__dirname, "../../../packages/react/src"),
      "@": resolve(__dirname, "../../../packages/react/src"),
    };

    // Suppress size warnings for development
    cfg.performance = {
      ...cfg.performance,
      maxAssetSize: 5000000, // 5MB
      maxEntrypointSize: 5000000, // 5MB
    };

    // Add custom resolver to handle package.json exports correctly
    const originalResolve = cfg.resolve!;
    cfg.resolve = {
      ...originalResolve,
      plugins: [
        ...(originalResolve.plugins || []),
        {
          apply: (resolver: any) => {
            resolver.hooks.resolve.tapAsync(
              "CopilotKitResolver",
              (request: any, resolveContext: any, callback: any) => {
                if (request.request === "@copilotkit/react/styles.css") {
                  const cssPath = resolve(
                    __dirname,
                    "../../../packages/react/dist/styles.css"
                  );
                  return callback(null, {
                    path: cssPath,
                    request: undefined,
                  });
                }
                return callback();
              }
            );
          },
        },
      ],
    };

    return cfg;
  },
};
export default config;
