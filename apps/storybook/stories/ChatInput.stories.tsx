import type { Meta, StoryObj } from "@storybook/react";
import { within, userEvent, expect } from "@storybook/test";
import { CopilotChatInput } from "@copilotkit/react";

const meta = {
  title: "UI/CopilotChatInput",
  component: CopilotChatInput,
  args: {
    onSend: (t: string) => console.log(`Message sent: ${t}`),
    onTranscribe: () => console.log("Transcribe started"),
  },
} satisfies Meta<typeof CopilotChatInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Restyled: Story = {
  args: {
    appearance: {
      container: "bg-slate-800 text-white",
      button: "bg-emerald-600",
    },
  },
};

export const SwappedElements: Story = {
  args: {
    components: {
      Button: (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
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
    children: ({ TextArea, Button, TranscribeButton }) => (
      <fieldset className="border p-4 space-y-2">
        <legend className="font-semibold">Custom wrapper</legend>
        <div className="flex gap-2 items-center">
          {TranscribeButton}
          {Button}
          {TextArea}
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
