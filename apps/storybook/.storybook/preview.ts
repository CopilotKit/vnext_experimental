import type { Preview } from "@storybook/react-webpack5";
import { withThemeByClassName } from "@storybook/addon-themes";
import "@copilotkit/react/styles.css";

const preview: Preview = {
  parameters: {
    // Disable the backgrounds addon to avoid conflicts with dark mode
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    withThemeByClassName({
      themes: {
        light: "", // default = no extra class
        dark: "dark", // adds class="dark" to <html> in the preview iframe
      },
      defaultTheme: "light",
    }),
  ],
};

export default preview;
