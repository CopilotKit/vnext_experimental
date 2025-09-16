import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import {
  CopilotChatInput,
  CopilotChatConfigurationProvider,
  type ToolsMenuItem,
} from "@copilotkitnext/react";

const meta = {
  title: "UI/CopilotChatInput",
  component: CopilotChatInput,
  tags: ["autodocs"],
  decorators: [
    (Story, args) => {
      const [inputValue, setInputValue] = useState(args.args.value || "");

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
              threadId="storybook-thread"
              inputValue={inputValue}
              onChangeInput={setInputValue}
              onSubmitInput={(value) => {
                console.log(`Message sent: ${value}`);
                args.args.onSubmit?.(value);
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
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: `
The CopilotChatInput component provides a feature-rich chat input interface for React applications.

## Features
- 📝 Auto-resizing textarea with configurable max rows
- 🎙️ Voice recording mode with visual feedback
- 🛠️ Customizable tools dropdown menu
- 📎 File attachment support
- 🎨 Dark/light theme support
- 🔧 Fully customizable via render props and custom components
- ♿ Accessible with ARIA labels and keyboard navigation

## Basic Usage

\`\`\`tsx
import { CopilotChatInput, CopilotChatConfigurationProvider } from '@copilotkitnext/react';

function ChatComponent() {
  const [inputValue, setInputValue] = useState("");
  
  return (
    <CopilotChatConfigurationProvider
      threadId="demo-thread"
      inputValue={inputValue}
      onChangeInput={setInputValue}
      onSubmitInput={(value) => {
        console.log('Message:', value);
        setInputValue("");
      }}
    >
      <CopilotChatInput />
    </CopilotChatConfigurationProvider>
  );
}
\`\`\`

## Customization

The component supports extensive customization through:
- **Props**: Configure behavior and appearance
- **Render Props**: Replace default UI elements with custom components
- **Custom Components**: Pass custom components for buttons and toolbars
- **Styling**: Apply custom CSS classes

See individual stories below for detailed examples of each customization approach.
        `,
      },
    },
  },
  argTypes: {
    mode: {
      control: { type: "radio" },
      options: ["input", "transcribe"],
      description: "The input mode - text input or voice recording",
      table: {
        type: { summary: "'input' | 'transcribe'" },
        defaultValue: { summary: "input" },
        category: "Behavior",
      },
    },
    toolsMenu: {
      description: "Array of menu items for the tools dropdown",
      table: {
        type: { summary: "(ToolsMenuItem | '-')[]" },
        category: "Features",
      },
    },
    sendButton: {
      description: "Custom send button component",
      table: {
        type: { summary: "React.ComponentType<ButtonHTMLAttributes>" },
        category: "Customization",
      },
    },
    additionalToolbarItems: {
      description: "Additional toolbar items to display",
      table: {
        type: { summary: "React.ReactNode" },
        category: "Customization",
      },
    },
    textArea: {
      description: "Textarea configuration",
      table: {
        type: { summary: "{ maxRows?: number }" },
        category: "Configuration",
      },
    },
    value: {
      control: { type: "text" },
      description: "The current input value (controlled through provider)",
      table: {
        type: { summary: "string" },
        defaultValue: { summary: "" },
        category: "Data",
      },
    },
    onStartTranscribe: {
      action: "startTranscribe",
      description: "Callback when voice recording starts",
      table: {
        type: { summary: "() => void" },
        category: "Events",
      },
    },
    onCancelTranscribe: {
      action: "cancelTranscribe",
      description: "Callback when voice recording is cancelled",
      table: {
        type: { summary: "() => void" },
        category: "Events",
      },
    },
    onFinishTranscribe: {
      action: "finishTranscribe",
      description: "Callback when voice recording completes",
      table: {
        type: { summary: "() => void" },
        category: "Events",
      },
    },
    onAddFile: {
      action: "addFile",
      description: "Callback when file attachment is clicked",
      table: {
        type: { summary: "() => void" },
        category: "Events",
      },
    },
    onSubmit: {
      action: "submit",
      description: "Callback when message is submitted",
      table: {
        type: { summary: "(value: string) => void" },
        category: "Events",
      },
    },
  },
  args: {
    onStartTranscribe: () => console.log("Transcribe started"),
    onCancelTranscribe: () => console.log("Transcribe cancelled"),
    onFinishTranscribe: () => console.log("Transcribe completed"),
    onAddFile: () => console.log("Add files clicked"),
  },
} satisfies Meta<typeof CopilotChatInput>;

export default meta;
type Story = StoryObj<typeof meta>;

// 1. Default story
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: "The default chat input with all standard features enabled.",
      },
    },
  },
};

// 2. With Tools Menu
export const WithToolsMenu: Story = {
  args: {
    toolsMenu: [
      {
        label: "Do X",
        action: () => {
          console.log("Do X clicked");
          alert("Action: Do X was clicked!");
        },
      },
      {
        label: "Do Y",
        action: () => {
          console.log("Do Y clicked");
          alert("Action: Do Y was clicked!");
        },
      },
      "-",
      {
        label: "Advanced",
        items: [
          {
            label: "Do Advanced X",
            action: () => {
              console.log("Do Advanced X clicked");
              alert("Advanced Action: Do Advanced X was clicked!");
            },
          },
          "-",
          {
            label: "Do Advanced Y",
            action: () => {
              console.log("Do Advanced Y clicked");
              alert("Advanced Action: Do Advanced Y was clicked!");
            },
          },
        ],
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: `
Demonstrates a tools dropdown menu with nested items and separators.

\`\`\`tsx
const toolsMenu = [
  { label: 'Action 1', action: () => {} },
  '-', // Separator
  { 
    label: 'Submenu',
    items: [
      { label: 'Sub Action', action: () => {} }
    ]
  }
];

<CopilotChatInput toolsMenu={toolsMenu} />
\`\`\`
        `,
      },
    },
  },
};

// 3. Transcribe Mode
export const TranscribeMode: Story = {
  args: {
    mode: "transcribe",
  },
  parameters: {
    docs: {
      description: {
        story: `
Voice recording mode with animated waveform visualization.

\`\`\`tsx
<CopilotChatInput mode="transcribe" />
\`\`\`

Callbacks:
- \`onStartTranscribe\` - Recording started
- \`onCancelTranscribe\` - Recording cancelled
- \`onFinishTranscribe\` - Recording completed
        `,
      },
    },
  },
};

// 4. Custom Send Button
export const CustomSendButton: Story = {
  args: {
    textArea: {
      maxRows: 10,
    },
    sendButton: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button
        {...props}
        className="rounded-full w-10 h-10 bg-blue-500 text-white hover:bg-blue-600 transition-colors mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Send message"
      >
        ✈️
      </button>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: `
Replace the default send button with a custom component using render props.

\`\`\`tsx
<CopilotChatInput
  sendButton={(props) => (
    <button {...props} className="custom-send-btn">
      ✈️
    </button>
  )}
/>
\`\`\`

The component receives all necessary props including:
- \`onClick\`: Handler for sending the message
- \`disabled\`: Whether sending is currently allowed
- Standard button HTML attributes
        `,
      },
    },
  },
};

// 5. With Additional Toolbar Items
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
  parameters: {
    docs: {
      description: {
        story: `
Add custom toolbar items alongside the default tools.

\`\`\`tsx
<CopilotChatInput
  additionalToolbarItems={
    <>
      <button className="custom-toolbar-btn">⭐</button>
      <button className="custom-toolbar-btn">🔖</button>
    </>
  }
/>
\`\`\`

These items appear in the toolbar area next to the default buttons.
        `,
      },
    },
  },
};

// 6. Prefilled Text
export const PrefilledText: Story = {
  args: {
    value: "Hello, this is a prefilled message!",
  },
  parameters: {
    docs: {
      description: {
        story: `
Initialize the input with pre-populated text.

\`\`\`tsx
<CopilotChatConfigurationProvider
  threadId="demo-thread"
  inputValue="Hello, this is a prefilled message!"
  onChangeInput={setInputValue}
>
  <CopilotChatInput />
</CopilotChatConfigurationProvider>
\`\`\`

Useful for:
- Draft messages
- Edit mode
- Template messages
        `,
      },
    },
  },
};

// 7. Expanded Textarea
export const ExpandedTextarea: Story = {
  args: {
    value:
      "This is a longer message that will cause the textarea to expand.\n\nIt has multiple lines to demonstrate the auto-resize functionality.\n\nThe textarea will grow up to the maxRows limit.",
    textArea: {
      maxRows: 10,
    },
  },
  parameters: {
    docs: {
      description: {
        story: `
Demonstrates auto-expanding textarea behavior with multiline content.

The textarea automatically resizes based on content, up to a configurable maximum height.

\`\`\`tsx
<CopilotChatInput
  textArea={{
    maxRows: 10
  }}
/>
\`\`\`

Features:
- Smooth expansion animation
- Maintains scroll position
- Respects maxRows configuration
        `,
      },
    },
  },
};

// 8. Custom Styling
export const CustomStyling: Story = {
  decorators: [
    (Story) => (
      <>
        <style>{`
          .custom-chat-input {
            border: 2px solid #4f46e5 !important;
            border-radius: 12px !important;
            background: linear-gradient(to right, #f3f4f6, #ffffff) !important;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
            padding: 12px !important;
          }
          
          .custom-chat-input textarea {
            font-family: 'Monaco', 'Consolas', monospace !important;
            font-size: 14px !important;
            color: #1e293b !important;
          }
          
          .custom-chat-input button {
            transition: all 0.3s ease !important;
          }
          
          .custom-chat-input button:hover {
            transform: scale(1.05) !important;
          }
        `}</style>
        <Story />
      </>
    ),
  ],
  args: {
    className: "custom-chat-input",
  },
  parameters: {
    docs: {
      description: {
        story: `
Apply custom CSS classes for unique styling. This example demonstrates inline styles that override default component styling.

\`\`\`tsx
// Add styles to your component or global CSS
const styles = \`
  .custom-chat-input {
    border: 2px solid #4f46e5;
    border-radius: 12px;
    background: linear-gradient(to right, #f3f4f6, #ffffff);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  }
\`;

// Use the custom class
<CopilotChatInput className="custom-chat-input" />
\`\`\`

This example shows:
- Custom border and background styling
- Modified typography for the textarea
- Hover effects on buttons
- Box shadow for depth
        `,
      },
    },
  },
};

// === ADDITIONAL CUSTOMIZATION EXAMPLE ===
// This story demonstrates combining multiple customization approaches

export const MultipleCustomizations: Story = {
  name: "Multiple Customizations Combined",
  args: {
    sendButton: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button
        {...props}
        className="rounded-full w-10 h-10 bg-blue-500 text-white hover:bg-blue-600 transition-colors mr-2"
      >
        ✈️
      </button>
    ),
    additionalToolbarItems: (
      <>
        <button
          className="h-8 w-8 p-0 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center ml-1"
          title="Attach file"
        >
          📎
        </button>
        <button
          className="h-8 w-8 p-0 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center ml-1"
          title="Add emoji"
        >
          😊
        </button>
      </>
    ),
    toolsMenu: [
      {
        label: "Quick Actions",
        items: [
          { label: "Clear", action: () => console.log("Clear") },
          { label: "Export", action: () => console.log("Export") },
        ],
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: `
Combine multiple customization approaches simultaneously.

\`\`\`tsx
<CopilotChatInput
  sendButton={(props) => <CustomButton {...props} />}
  additionalToolbarItems={<>
    <button>📎</button>
    <button>😊</button>
  </>}
  toolsMenu={toolsConfig}
/>
\`\`\`

Each customization works independently, allowing for granular control over the entire component.
        `,
      },
    },
  },
};
