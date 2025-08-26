import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  CopilotChatMessageViewComponent,
  CopilotChatMessageViewCursorComponent,
  provideCopilotChatConfiguration,
  Message
} from '@copilotkit/angular';

const meta: Meta<CopilotChatMessageViewComponent> = {
  title: 'UI/CopilotChatMessageView',
  component: CopilotChatMessageViewComponent,
  parameters: {
    docs: {
      description: {
        component:
          'A simple conversation between user and AI using CopilotChatMessageView component.',
      },
    },
  },
  decorators: [
    moduleMetadata({
      imports: [
        CommonModule,
        CopilotChatMessageViewComponent,
        CopilotChatMessageViewCursorComponent
      ],
      providers: [
        provideCopilotChatConfiguration({
          labels: {
            assistantMessageToolbarCopyMessageLabel: 'Copy',
            assistantMessageToolbarCopyCodeLabel: 'Copy',
            assistantMessageToolbarCopyCodeCopiedLabel: 'Copied',
            assistantMessageToolbarThumbsUpLabel: 'Good response',
            assistantMessageToolbarThumbsDownLabel: 'Bad response',
            assistantMessageToolbarReadAloudLabel: 'Read aloud',
            assistantMessageToolbarRegenerateLabel: 'Regenerate',
            userMessageToolbarCopyMessageLabel: 'Copy',
            userMessageToolbarEditMessageLabel: 'Edit'
          }
        })
      ],
    }),
  ],
};

export default meta;
type Story = StoryObj<CopilotChatMessageViewComponent>;

// Default story with full conversation - matches React exactly
export const Default: Story = {
  parameters: {
    layout: 'fullscreen',
    docs: {
      source: {
        type: 'code',
        code: `import { Component } from '@angular/core';
import { CopilotChatMessageViewComponent, Message } from '@copilotkit/angular';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CopilotChatMessageViewComponent],
  template: \`
    <copilot-chat-message-view
      [messages]="messages"
      [assistantMessageProps]="assistantMessageProps">
    </copilot-chat-message-view>
  \`
})
export class ChatComponent {
  messages: Message[] = [
    {
      id: 'user-1',
      content: 'Hello! Can you help me understand how React hooks work?',
      role: 'user',
    },
    {
      id: 'assistant-1',
      content: \`React hooks are functions that let you use state and other React features in functional components. Here are the most common ones:

- **useState** - Manages local state
- **useEffect** - Handles side effects
- **useContext** - Accesses context values
- **useCallback** - Memoizes functions
- **useMemo** - Memoizes values

Would you like me to explain any of these in detail?\`,
      role: 'assistant',
    },
    {
      id: 'user-2',
      content: 'Yes, could you explain useState with a simple example?',
      role: 'user',
    },
    {
      id: 'assistant-2',
      content: \`Absolutely! Here's a simple useState example:

\\\`\\\`\\\`jsx
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
\\\`\\\`\\\`

In this example:
- \\\`useState(0)\\\` initializes the state with value 0
- It returns an array: \\\`[currentValue, setterFunction]\\\`
- \\\`count\\\` is the current state value
- \\\`setCount\\\` is the function to update the state\`,
      role: 'assistant',
    },
  ];

  assistantMessageProps = {
    onThumbsUp: () => {
      console.log('Thumbs up clicked!');
      alert('thumbsUp');
    },
    onThumbsDown: () => {
      console.log('Thumbs down clicked!');
      alert('thumbsDown');
    },
  };
}`,
        language: 'typescript',
      },
    },
  },
  render: () => {
    const messages: Message[] = [
      {
        id: 'user-1',
        content: 'Hello! Can you help me understand how React hooks work?',
        role: 'user' as const,
      },
      {
        id: 'assistant-1',
        content: `React hooks are functions that let you use state and other React features in functional components. Here are the most common ones:

- **useState** - Manages local state
- **useEffect** - Handles side effects
- **useContext** - Accesses context values
- **useCallback** - Memoizes functions
- **useMemo** - Memoizes values

Would you like me to explain any of these in detail?`,
        role: 'assistant' as const,
      },
      {
        id: 'user-2',
        content: 'Yes, could you explain useState with a simple example?',
        role: 'user' as const,
      },
      {
        id: 'assistant-2',
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
        role: 'assistant' as const,
      },
    ];

    return {
      props: {
        messages,
        assistantMessageProps: {
          onThumbsUp: () => {
            console.log('Thumbs up clicked!');
            alert('thumbsUp');
          },
          onThumbsDown: () => {
            console.log('Thumbs down clicked!');
            alert('thumbsDown');
          },
        },
      },
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: auto;">
          <div style="height: 100%;">
            <copilot-chat-message-view
              [messages]="messages"
              [assistantMessageProps]="assistantMessageProps">
            </copilot-chat-message-view>
          </div>
        </div>
      `,
    };
  },
};

// ShowCursor story - matches React exactly
export const ShowCursor: Story = {
  parameters: {
    layout: 'fullscreen',
    docs: {
      source: {
        type: 'code',
        code: `import { Component } from '@angular/core';
import { CopilotChatMessageViewComponent, Message } from '@copilotkit/angular';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CopilotChatMessageViewComponent],
  template: \`
    <copilot-chat-message-view
      [messages]="messages"
      [showCursor]="true"
      [assistantMessageProps]="assistantMessageProps">
    </copilot-chat-message-view>
  \`
})
export class ChatComponent {
  messages: Message[] = [
    {
      id: 'user-1',
      content: 'Can you explain how AI models work?',
      role: 'user',
    },
  ];

  assistantMessageProps = {
    onThumbsUp: () => {
      console.log('Thumbs up clicked!');
      alert('thumbsUp');
    },
    onThumbsDown: () => {
      console.log('Thumbs down clicked!');
      alert('thumbsDown');
    },
  };
}`,
        language: 'typescript',
      },
    },
  },
  render: () => {
    const messages: Message[] = [
      {
        id: 'user-1',
        content: 'Can you explain how AI models work?',
        role: 'user' as const,
      },
    ];

    return {
      props: {
        messages,
        showCursor: true,
        assistantMessageProps: {
          onThumbsUp: () => {
            console.log('Thumbs up clicked!');
            alert('thumbsUp');
          },
          onThumbsDown: () => {
            console.log('Thumbs down clicked!');
            alert('thumbsDown');
          },
        },
      },
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: auto;">
          <div style="height: 100%;">
            <copilot-chat-message-view
              [messages]="messages"
              [showCursor]="showCursor"
              [assistantMessageProps]="assistantMessageProps">
            </copilot-chat-message-view>
          </div>
        </div>
      `,
    };
  },
};