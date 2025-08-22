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

// Default story with full conversation
export const Default: Story = {
  parameters: {
    layout: 'fullscreen',
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

// Story showing cursor animation
export const ShowCursor: Story = {
  parameters: {
    layout: 'fullscreen',
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

// Story with custom classes
export const CustomClasses: Story = {
  parameters: {
    layout: 'fullscreen',
  },
  render: () => {
    const messages: Message[] = [
      {
        id: 'user-1',
        content: 'This message has custom styling',
        role: 'user' as const,
      },
      {
        id: 'assistant-1',
        content: 'This assistant message also has custom styling!',
        role: 'assistant' as const,
      },
    ];

    return {
      props: {
        messages,
        inputClass: 'bg-gray-50 p-4 rounded-lg',
        assistantMessageClass: 'text-blue-600',
        userMessageClass: 'text-green-600',
        cursorClass: 'bg-red-500',
        showCursor: true,
      },
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: auto;">
          <div style="height: 100%; padding: 20px;">
            <copilot-chat-message-view
              [messages]="messages"
              [inputClass]="inputClass"
              [assistantMessageClass]="assistantMessageClass"
              [userMessageClass]="userMessageClass"
              [cursorClass]="cursorClass"
              [showCursor]="showCursor">
            </copilot-chat-message-view>
          </div>
        </div>
      `,
    };
  },
};

// Story with custom layout template
export const CustomLayout: Story = {
  parameters: {
    layout: 'fullscreen',
  },
  render: () => {
    const messages: Message[] = [
      {
        id: 'user-1',
        content: 'First user message',
        role: 'user' as const,
      },
      {
        id: 'assistant-1',
        content: 'First assistant response',
        role: 'assistant' as const,
      },
      {
        id: 'user-2',
        content: 'Second user message',
        role: 'user' as const,
      },
      {
        id: 'assistant-2',
        content: 'Second assistant response',
        role: 'assistant' as const,
      },
    ];

    return {
      props: {
        messages,
        showCursor: true,
      },
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: auto;">
          <copilot-chat-message-view
            [messages]="messages"
            [showCursor]="showCursor">
            <ng-template #customLayout let-messages="messages" let-showCursor="showCursor" let-messageElements="messageElements">
              <div style="padding: 20px; background: linear-gradient(to bottom, #f0f0f0, #ffffff);">
                <h2 style="text-align: center; color: #333; margin-bottom: 20px;">
                  Custom Chat Layout
                </h2>
                <div style="background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                  <div style="margin-bottom: 10px; color: #666;">
                    Total Messages: {{ messages.length }}
                  </div>
                  <div style="margin-bottom: 10px; color: #666;">
                    Cursor Active: {{ showCursor ? 'Yes' : 'No' }}
                  </div>
                  <div style="margin-bottom: 20px; color: #666;">
                    Message Elements: {{ messageElements.length }}
                  </div>
                  <div style="border-top: 1px solid #eee; padding-top: 20px;">
                    <div *ngFor="let msg of messages" style="margin-bottom: 15px; padding: 10px; background: #f9f9f9; border-radius: 5px;">
                      <strong>{{ msg.role === 'user' ? 'User' : 'Assistant' }}:</strong> {{ msg.content }}
                    </div>
                  </div>
                  <div *ngIf="showCursor" style="text-align: center; margin-top: 20px;">
                    <span style="display: inline-block; width: 11px; height: 11px; background: #333; border-radius: 50%; animation: pulse 1s infinite;"></span>
                    <span style="margin-left: 10px; color: #666;">AI is thinking...</span>
                  </div>
                </div>
              </div>
            </ng-template>
          </copilot-chat-message-view>
        </div>
      `,
    };
  },
};

// Story with empty state
export const EmptyState: Story = {
  parameters: {
    layout: 'fullscreen',
  },
  render: () => {
    return {
      props: {
        messages: [],
        showCursor: true,
      },
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: auto;">
          <div style="height: 100%; display: flex; align-items: center; justify-content: center;">
            <div style="text-align: center;">
              <p style="color: #666; margin-bottom: 20px;">No messages yet. Start a conversation!</p>
              <copilot-chat-message-view
                [messages]="messages"
                [showCursor]="showCursor">
              </copilot-chat-message-view>
            </div>
          </div>
        </div>
      `,
    };
  },
};

// Story with long conversation for performance testing
export const LongConversation: Story = {
  parameters: {
    layout: 'fullscreen',
  },
  render: () => {
    const messages: Message[] = [];
    
    // Generate 50 message pairs (100 messages total)
    for (let i = 0; i < 50; i++) {
      messages.push({
        id: `user-${i}`,
        content: `User question ${i + 1}: This is a sample question about topic ${i + 1}. Can you help me understand it better?`,
        role: 'user' as const,
      });
      
      messages.push({
        id: `assistant-${i}`,
        content: `Assistant response ${i + 1}: Of course! Let me explain topic ${i + 1} in detail.

This is a comprehensive response that includes:
- **Point 1**: Important information about the topic
- **Point 2**: Additional details and context
- **Point 3**: Examples and use cases

\`\`\`javascript
// Example code for topic ${i + 1}
function example${i + 1}() {
  console.log('This is example ${i + 1}');
  return 'Result ${i + 1}';
}
\`\`\`

I hope this helps clarify topic ${i + 1} for you!`,
        role: 'assistant' as const,
      });
    }

    return {
      props: {
        messages,
        showCursor: false,
      },
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: auto;">
          <div style="padding: 20px;">
            <h3 style="margin-bottom: 10px;">Performance Test: {{ messages.length }} messages</h3>
            <copilot-chat-message-view
              [messages]="messages"
              [showCursor]="showCursor">
            </copilot-chat-message-view>
          </div>
        </div>
      `,
    };
  },
};