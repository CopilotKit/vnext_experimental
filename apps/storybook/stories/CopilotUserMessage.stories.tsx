import type { Meta, StoryObj } from "@storybook/react";
import {
  CopilotUserMessage,
  CopilotChatContextProvider,
  type CopilotUserMessageProps,
} from "@copilotkit/react";

// Simple default message
const simpleMessage = {
  id: "simple-user-message",
  content: "Hello! Can you help me build a React component?",
  timestamp: new Date(),
  role: "user" as const,
};

// Longer user message
const longMessage = {
  id: "long-user-message",
  content: `I need help with creating a complex React component that handles user authentication. Here are my requirements:

1. The component should have login and signup forms
2. It needs to integrate with Firebase Auth
3. Should handle form validation
4. Must be responsive and work on mobile
5. Include forgot password functionality
6. Support social login (Google, GitHub)

Can you help me implement this step by step? I'm particularly struggling with the form validation and state management parts.`,
  timestamp: new Date(),
  role: "user" as const,
};

// Code-related user message
const codeMessage = {
  id: "code-user-message",
  content: `I'm getting this error in my React app:

TypeError: Cannot read property 'map' of undefined

The error happens in this component:

function UserList({ users }) {
  return (
    <div>
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}

How can I fix this?`,
  timestamp: new Date(),
  role: "user" as const,
};

// Short question
const shortMessage = {
  id: "short-user-message",
  content: "What's the difference between useState and useReducer?",
  timestamp: new Date(),
  role: "user" as const,
};

const meta = {
  title: "UI/CopilotUserMessage",
  component: CopilotUserMessage,
  decorators: [
    (Story) => (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          minHeight: "100vh",
          padding: "16px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "640px" }}>
          <CopilotChatContextProvider>
            <Story />
          </CopilotChatContextProvider>
        </div>
      </div>
    ),
  ],
  args: {
    message: simpleMessage,
    onEdit: () => console.log("Edit clicked!"),
  },
} satisfies Meta<typeof CopilotUserMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongMessage: Story = {
  args: {
    message: longMessage,
  },
};

export const WithEditButton: Story = {
  args: {
    message: simpleMessage,
    onEdit: () => alert("Edit message clicked!"),
  },
};

export const WithoutEditButton: Story = {
  args: {
    message: simpleMessage,
    onEdit: undefined, // No edit callback means no edit button
  },
};

export const CodeRelatedMessage: Story = {
  args: {
    message: codeMessage,
    onEdit: () => alert("Edit code message clicked!"),
  },
};

export const ShortQuestion: Story = {
  args: {
    message: shortMessage,
    onEdit: () => console.log("Edit short message clicked!"),
  },
};

export const WithAdditionalToolbarItems: Story = {
  args: {
    message: simpleMessage,
    onEdit: () => console.log("Edit clicked!"),
    additionalToolbarItems: (
      <>
        <button
          className="h-8 w-8 p-0 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
          onClick={() => alert("Custom button 1 clicked!")}
          title="Custom Action 1"
        >
          📎
        </button>
        <button
          className="h-8 w-8 p-0 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
          onClick={() => alert("Custom button 2 clicked!")}
          title="Custom Action 2"
        >
          🔄
        </button>
      </>
    ),
  },
};

export const CustomAppearance: Story = {
  args: {
    message: simpleMessage,
    onEdit: () => console.log("Edit clicked!"),
    appearance: {
      container: "bg-blue-50 border border-blue-200 rounded-lg p-4",
      messageRenderer: "text-blue-900 font-medium",
      toolbar: "mt-3 justify-end",
      copyButton: "text-blue-600 hover:bg-blue-100",
      editButton: "text-blue-600 hover:bg-blue-100",
    },
  },
};

export const CustomComponents: Story = {
  args: {
    message: simpleMessage,
    onEdit: () => console.log("Edit clicked!"),
    components: {
      Container: ({ children, className, ...props }) => (
        <div
          className={`bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4 shadow-sm ${className}`}
          {...props}
        >
          {children}
        </div>
      ),
      MessageRenderer: ({ content, className }) => (
        <div className={`font-mono text-purple-800 ${className}`}>
          💬 {content}
        </div>
      ),
    },
  },
};

export const UsingChildrenRenderProp: Story = {
  args: {
    message: longMessage,
    onEdit: () => console.log("Edit clicked!"),
    children: ({ MessageRenderer, Toolbar, CopyButton, EditButton }) => (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 mr-4">{MessageRenderer}</div>
          <div className="flex items-center gap-1">
            {CopyButton}
            {EditButton}
          </div>
        </div>
        <div className="mt-2 text-xs text-yellow-700">
          Custom layout using children render prop
        </div>
      </div>
    ),
  },
};

export const WithBranchNavigation: Story = {
  args: {
    message: {
      id: "branch-message",
      content:
        "This message has multiple branches. You can navigate between them using the branch controls.",
      role: "user" as const,
    },
    onEdit: () => console.log("Edit clicked!"),
    branchIndex: 2,
    numberOfBranches: 3,
    onSwitchToBranch: (branchIndex: number) =>
      console.log(`Switching to branch ${branchIndex + 1}`),
  },
};

export const WithManyBranches: Story = {
  args: {
    message: {
      id: "many-branches-message",
      content:
        "This is branch 5 of 10. Use the navigation arrows to explore different variations of this message.",
      role: "user" as const,
    },
    onEdit: () => console.log("Edit clicked!"),
    branchIndex: 4,
    numberOfBranches: 10,
    onSwitchToBranch: (branchIndex: number) =>
      alert(`Would switch to branch ${branchIndex + 1} of 10`),
  },
};
