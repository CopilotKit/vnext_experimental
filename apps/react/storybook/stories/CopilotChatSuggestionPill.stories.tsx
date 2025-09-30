import type { Meta, StoryObj } from "@storybook/react";
import { Sparkles, ArrowRight } from "lucide-react";
import { CopilotChatSuggestionPill } from "@copilotkitnext/react";

const meta = {
  title: "UI/CopilotChatSuggestionPill",
  component: CopilotChatSuggestionPill,
  args: {
    children: "Draft a project brief",
  },
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof CopilotChatSuggestionPill>;

export default meta;

type Story = StoryObj<typeof CopilotChatSuggestionPill>;

export const Default: Story = {};

export const WithIcon: Story = {
  args: {
    icon: <Sparkles className="h-4 w-4" aria-hidden="true" />,
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

export const WithDescription: Story = {
  args: {
    description: "Summarize this week's notes into next steps",
    icon: <ArrowRight className="h-4 w-4" aria-hidden="true" />,
  },
};
