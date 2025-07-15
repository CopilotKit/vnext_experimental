import type { Meta, StoryObj } from "@storybook/react";
import {
  CopilotChatInput,
  CopilotChatContextProvider,
} from "@copilotkit/react";

const meta = {
  title: "UI/CopilotChatInput",
  component: CopilotChatInput,
  decorators: [
    (Story) => (
      <CopilotChatContextProvider>
        <Story />
      </CopilotChatContextProvider>
    ),
  ],
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

export const CustomSendButton: Story = {
  args: {
    components: {
      SendButton: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
        <button
          {...props}
          className="rounded-full w-10 h-10 bg-blue-500 text-white hover:bg-blue-600 transition-colors mr-2"
        >
          ✈️
        </button>
      ),
    },
  },
};

export const Transcribe: Story = {
  args: {
    mode: "transcribe",
  },
};
