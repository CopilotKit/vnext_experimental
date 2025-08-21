import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import {
  CopilotChatInput,
  CopilotChatConfigurationProvider,
  type ToolsMenuItem,
} from "@copilotkit/react";

const meta = {
  title: "UI/CopilotChatInput",
  component: CopilotChatInput,
  decorators: [
    (Story) => {
      const [inputValue, setInputValue] = useState("");
      
      return (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div style={{ width: "100%", maxWidth: "640px" }}>
            <CopilotChatConfigurationProvider
              inputValue={inputValue}
              onChangeInput={setInputValue}
              onSubmitInput={(value) => {
                console.log(`Message sent: ${value}`);
                setInputValue("");
              }}
            >
              <Story />
            </CopilotChatConfigurationProvider>
          </div>
        </div>
      );
    },
  ],
  args: {
    onStartTranscribe: () => console.log("Transcribe started"),
    onCancelTranscribe: () => console.log("Transcribe cancelled"),
    onFinishTranscribe: () => console.log("Transcribe completed"),
    onAddFile: () => console.log("Add files clicked"),
  },
} satisfies Meta<typeof CopilotChatInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithToolsMenu: Story = {
  args: {
    toolsMenu: [
      {
        label: "Do X",
        action: () => console.log("Do X clicked"),
      },
      {
        label: "Do Y",
        action: () => console.log("Do Y clicked"),
      },
      "-",
      {
        label: "Advanced",
        items: [
          {
            label: "Do Advanced X",
            action: () => console.log("Do Advanced X clicked"),
          },
          "-",
          {
            label: "Do Advanced Y",
            action: () => console.log("Do Advanced Y clicked"),
          },
        ],
      },
    ],
  },
};

export const CustomSendButton: Story = {
  args: {
    textArea: {
      maxRows: 10,
    },
    sendButton: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button
        {...props}
        className="rounded-full w-10 h-10 bg-blue-500 text-white hover:bg-blue-600 transition-colors mr-2"
      >
        ✈️
      </button>
    ),
  },
};

export const Transcribe: Story = {
  args: {
    mode: "transcribe",
  },
};

export const WithAdditionalToolbarItems: Story = {
  args: {
    additionalToolbarItems: (
      <>
        <button
          className="h-8 w-8 p-0 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center ml-2"
          onClick={() => alert("Custom action clicked!")}
          title="Custom Action"
        >
          ⭐
        </button>
        <button
          className="h-8 w-8 p-0 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center ml-1"
          onClick={() => alert("Another custom action clicked!")}
          title="Another Custom Action"
        >
          🔖
        </button>
      </>
    ),
  },
};
