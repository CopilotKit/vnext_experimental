import type { Meta, StoryObj } from "@storybook/react";
import { WebInspector } from "@copilotkitnext/react";

const meta: Meta<typeof WebInspector> = {
  title: "Components/Web Inspector",
  component: WebInspector,
};

export default meta;

type Story = StoryObj<typeof WebInspector>;

export const Default: Story = {
  args: {},
};
