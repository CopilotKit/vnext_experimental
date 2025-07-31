import type { Meta, StoryObj } from "@storybook/react";
import {
  CopilotChatConfigurationProvider,
  CopilotChatMessageView,
} from "@copilotkit/react";

const meta = {
  title: "UI/CopilotChatMessageView",
  parameters: {
    docs: {
      description: {
        component:
          "A simple conversation between user and AI using CopilotChatMessageView component.",
      },
    },
  },
} satisfies Meta<{}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{ height: "100vh", margin: 0, padding: 0, overflow: "auto" }}>
        <Story />
      </div>
    ),
  ],
  render: () => {
    const messages = [
      {
        id: "user-1",
        content: "Hello! Can you help me understand how React hooks work?",
        timestamp: new Date(),
        role: "user" as const,
      },
      {
        id: "assistant-1",
        content: `React hooks are functions that let you use state and other React features in functional components. Here are the most common ones:

- **useState** - Manages local state
- **useEffect** - Handles side effects
- **useContext** - Accesses context values
- **useCallback** - Memoizes functions
- **useMemo** - Memoizes values

Would you like me to explain any of these in detail?`,
        timestamp: new Date(),
        role: "assistant" as const,
      },
      {
        id: "user-2",
        content: "Yes, could you explain useState with a simple example?",
        timestamp: new Date(),
        role: "user" as const,
      },
      {
        id: "assistant-2",
        content: `Absolutely! Here's a simple useState example:

\`\`\`jsx
import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
\`\`\`

In this example:
- \`useState(0)\` initializes the state with value 0
- It returns an array: \`[currentValue, setterFunction]\`
- \`count\` is the current state value
- \`setCount\` is the function to update the state`,
        timestamp: new Date(),
        role: "assistant" as const,
      },
    ];

    return (
      <CopilotChatConfigurationProvider>
        <div style={{ height: "100%" }}>
          <CopilotChatMessageView
            messages={messages}
            assistantMessage={{
              onThumbsUp: () => {
                alert("thumbsUp");
              },
              onThumbsDown: () => {
                alert("thumbsDown");
              },
            }}
          />
        </div>
      </CopilotChatConfigurationProvider>
    );
  },
};

export const ShowCursor: Story = {
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{ height: "100vh", margin: 0, padding: 0, overflow: "auto" }}>
        <Story />
      </div>
    ),
  ],
  render: () => {
    const messages = [
      {
        id: "user-1",
        content: "Can you explain how AI models work?",
        timestamp: new Date(),
        role: "user" as const,
      },
    ];

    return (
      <CopilotChatConfigurationProvider>
        <div style={{ height: "100%" }}>
          <CopilotChatMessageView
            messages={messages}
            showCursor={true}
            assistantMessage={{
              onThumbsUp: () => {
                alert("thumbsUp");
              },
              onThumbsDown: () => {
                alert("thumbsDown");
              },
            }}
          />
        </div>
      </CopilotChatConfigurationProvider>
    );
  },
};
