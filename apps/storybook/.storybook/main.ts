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
    cfg.resolve!.alias = {
      ...(cfg.resolve!.alias ?? {}),
      "@copilotkit/react": resolve(__dirname, "../../../packages/react/src"),
    };
    return cfg;
  },
};
export default config;
