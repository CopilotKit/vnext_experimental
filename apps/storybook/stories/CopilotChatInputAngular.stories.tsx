import type { Meta, StoryObj } from "@storybook/angular";
import { moduleMetadata } from "@storybook/angular";
import { CopilotChatInputComponent } from "@copilotkit/angular";
import { provideCopilotKit } from "@copilotkit/angular";

const meta: Meta<CopilotChatInputComponent> = {
  title: "CopilotKit/Angular/CopilotChatInput",
  component: CopilotChatInputComponent,
  decorators: [
    moduleMetadata({
      providers: [
        provideCopilotKit({
          endpoint: "https://api.copilotkit.example/v1",
        }),
      ],
    }),
  ],
  argTypes: {
    mode: {
      control: { type: "select" },
      options: ["input", "transcribe", "processing"],
    },
  },
};

export default meta;
type Story = StoryObj<CopilotChatInputComponent>;

export const Default: Story = {
  args: {
    mode: "input",
  },
};

export const Transcribe: Story = {
  args: {
    mode: "transcribe",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows the audio recording visualization with animated waveform bars.",
      },
    },
  },
};

export const Processing: Story = {
  args: {
    mode: "processing",
  },
};

export const WithToolsMenu: Story = {
  args: {
    mode: "input",
    toolsMenu: [
      {
        label: "Clear Chat",
        action: () => console.log("Clear chat"),
      },
      "-",
      {
        label: "Settings",
        items: [
          {
            label: "Theme",
            action: () => console.log("Change theme"),
          },
          {
            label: "Language",
            action: () => console.log("Change language"),
          },
        ],
      },
    ],
  },
};