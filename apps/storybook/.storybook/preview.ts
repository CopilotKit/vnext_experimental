import type { Preview } from "@storybook/react-webpack5";
import "@copilotkit/react/styles.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "white",
      values: [
        {
          name: "white",
          value: "#ffffff",
        },
        {
          name: "light",
          value: "#f8f8f8",
        },
        {
          name: "gray",
          value: "#f3f3f3",
        },
        {
          name: "dark",
          value: "#333333",
        },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
