import type { Meta, StoryObj } from "@storybook/react";
import { CopilotChatInput } from "@copilotkit/react";

const meta = {
  title: "UI/CopilotChatInput",
  component: CopilotChatInput,
  args: {
    onSend: (t: string) => console.log(`Message sent: ${t}`),
    onStartTranscribe: () => console.log("Transcribe started"),
    onCancelTranscribe: () => console.log("Transcribe cancelled"),
    onFinishTranscribe: () => console.log("Transcribe completed"),
    onAdd: () => console.log("Add files clicked"),
    onTools: () => console.log("Tools opened"),
  },
} satisfies Meta<typeof CopilotChatInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Transcribe: Story = {
  args: {
    mode: "transcribe",
  },
};
