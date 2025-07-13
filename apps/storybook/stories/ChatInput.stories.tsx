import type { Meta, StoryObj } from "@storybook/react";
import { within, userEvent, expect } from "@storybook/test";
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

export const TranscribeWithContent: Story = {
  args: {
    mode: "transcribe",
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = await c.getByRole("textbox");
    await userEvent.type(input, "This is transcribed text...");
  },
};

export const TranscribeMode: Story = {
  name: "Transcribe Mode - Recording Indicator",
  args: {
    mode: "transcribe",
  },
  parameters: {
    docs: {
      description: {
        story:
          "In transcribe mode, the recording indicator replaces the text area, and the Cancel (X) and Finish (✓) buttons replace the Transcribe and Send buttons. The Add and Tools buttons are disabled.",
      },
    },
  },
};

export const Restyled: Story = {
  args: {
    appearance: {
      container: "bg-slate-800 text-white",
      sendButton: "bg-emerald-600",
    },
  },
};

export const SwappedElements: Story = {
  args: {
    components: {
      SendButton: (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
        <button
          {...p}
          className="rounded-full w-10 h-10 bg-pink-500 text-white"
        >
          ⇪
        </button>
      ),
    },
  },
};

export const CustomLayout: Story = {
  args: {
    children: ({
      TextArea,
      RecordingIndicator,
      SendButton,
      StartTranscribeButton,
      CancelTranscribeButton,
      FinishTranscribeButton,
      AddButton,
      ToolsButton,
    }) => (
      <fieldset className="border p-4 space-y-2">
        <legend className="font-semibold">Custom wrapper</legend>
        <div className="flex gap-2 items-center">
          {AddButton}
          {ToolsButton}
          {StartTranscribeButton}
          {CancelTranscribeButton}
          {FinishTranscribeButton}
          {SendButton}
        </div>
        <div className="mt-2">
          {TextArea}
          {RecordingIndicator}
        </div>
      </fieldset>
    ),
  },
};

/* Interaction test: clears after send */
Default.play = async ({ canvasElement }) => {
  const c = within(canvasElement);
  const input = await c.getByRole("textbox");
  await userEvent.type(input, "hello{enter}");
  expect(input).toHaveValue("");
};
