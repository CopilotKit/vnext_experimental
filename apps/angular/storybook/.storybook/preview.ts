import type { Preview } from "@storybook/angular";
import { withThemeByClassName } from "@storybook/addon-themes";

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
    docs: {
      toc: true,
      // Canvas (bottom) code panel behavior
      canvas: { sourceState: 'shown' }, // Show source code by default
      // Enable the separate Code panel in Docs tab
      codePanel: true,
      // Configure source display
      source: {
        type: 'dynamic', // Update snippet as args/Controls change
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