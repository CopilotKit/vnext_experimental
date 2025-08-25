import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  CopilotChatViewComponent,
  CopilotChatMessageViewComponent,
  CopilotChatInputComponent,
  provideCopilotChatConfiguration,
  provideCopilotKit,
  Message
} from '@copilotkit/angular';

const meta: Meta<CopilotChatViewComponent> = {
  title: 'UI/CopilotChatView',
  component: CopilotChatViewComponent,
  parameters: {
    docs: {
      description: {
        component:
          'A complete chat interface with message feed and input components.',
      },
    },
    layout: 'fullscreen',
  },
  decorators: [
    moduleMetadata({
      imports: [
        CommonModule,
        CopilotChatViewComponent,
        CopilotChatMessageViewComponent,
        CopilotChatInputComponent
      ],
      providers: [
        provideCopilotKit({}),
        provideCopilotChatConfiguration({
          labels: {
            chatInputPlaceholder: 'Type a message...',
            chatDisclaimerText: 'AI can make mistakes. Please verify important information.',
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
type Story = StoryObj<CopilotChatViewComponent>;

// Default story with full conversation - matches React exactly
export const Default: Story = {
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
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: hidden;">
          <copilot-chat-view
            [messages]="messages"
            [autoScroll]="true"
            (assistantMessageThumbsUp)="onThumbsUp($event)"
            (assistantMessageThumbsDown)="onThumbsDown($event)"
            (assistantMessageReadAloud)="onReadAloud($event)"
            (assistantMessageRegenerate)="onRegenerate($event)">
          </copilot-chat-view>
        </div>
      `,
      props: {
        messages,
        onThumbsUp: (event: { message: Message }) => {
          alert(`Thumbs up for message: ${event.message.id}`);
        },
        onThumbsDown: (event: { message: Message }) => {
          alert(`Thumbs down for message: ${event.message.id}`);
        },
        onReadAloud: (event: { message: Message }) => {
          alert(`Read aloud message: ${event.message.id}`);
        },
        onRegenerate: (event: { message: Message }) => {
          alert(`Regenerate message: ${event.message.id}`);
        }
      },
    };
  },
};

// Story with manual scroll mode
export const ManualScroll: Story = {
  render: () => {
    const messages: Message[] = generateManyMessages(50);

    return {
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: hidden;">
          <copilot-chat-view
            [messages]="messages"
            [autoScroll]="false">
          </copilot-chat-view>
        </div>
      `,
      props: {
        messages
      },
    };
  },
};

// Story with empty state
export const EmptyState: Story = {
  render: () => {
    return {
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: hidden;">
          <copilot-chat-view
            [messages]="[]"
            [autoScroll]="true">
          </copilot-chat-view>
        </div>
      `,
      props: {},
    };
  },
};

// Story with custom disclaimer
export const CustomDisclaimer: Story = {
  render: () => {
    const messages: Message[] = [
      {
        id: 'user-1',
        content: 'What is TypeScript?',
        role: 'user' as const,
      },
      {
        id: 'assistant-1',
        content: 'TypeScript is a strongly typed programming language that builds on JavaScript, giving you better tooling at any scale.',
        role: 'assistant' as const,
      },
    ];

    return {
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: hidden;">
          <copilot-chat-view
            [messages]="messages"
            [autoScroll]="true"
            [disclaimerProps]="{ text: 'This is a custom disclaimer message for your chat interface.' }">
          </copilot-chat-view>
        </div>
      `,
      props: {
        messages
      },
    };
  },
};

// Story without feather effect
export const NoFeather: Story = {
  render: () => {
    const messages: Message[] = [
      {
        id: 'user-1',
        content: 'Hello!',
        role: 'user' as const,
      },
      {
        id: 'assistant-1',
        content: 'Hi there! How can I help you today?',
        role: 'assistant' as const,
      },
    ];

    return {
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: hidden;">
          <copilot-chat-view
            [messages]="messages"
            [autoScroll]="true"
            [featherComponent]="null">
          </copilot-chat-view>
        </div>
      `,
      props: {
        messages
      },
    };
  },
};

// Helper function to generate many messages for testing scroll
function generateManyMessages(count: number): Message[] {
  const messages: Message[] = [];
  for (let i = 0; i < count; i++) {
    if (i % 2 === 0) {
      messages.push({
        id: `user-${i}`,
        content: `User message ${i}: This is a test message to demonstrate scrolling behavior.`,
        role: 'user' as const,
      });
    } else {
      messages.push({
        id: `assistant-${i}`,
        content: `Assistant response ${i}: This is a longer response to demonstrate how the chat interface handles various message lengths and scrolling behavior when there are many messages in the conversation.`,
        role: 'assistant' as const,
      });
    }
  }
  return messages;
}

// Story with custom template slots
export const WithTemplateSlots: Story = {
  render: () => {
    const messages: Message[] = [
      {
        id: 'user-1',
        content: 'Hello! Can you help me with TypeScript?',
        role: 'user' as const,
      },
      {
        id: 'assistant-1',
        content: 'Of course! TypeScript is a superset of JavaScript that adds static typing. What would you like to know?',
        role: 'assistant' as const,
      },
    ];

    @Component({
      selector: 'story-component',
      standalone: true,
      imports: [CommonModule, CopilotChatViewComponent],
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: hidden;">
          <copilot-chat-view
            [messages]="messages"
            [autoScroll]="true"
            (assistantMessageThumbsUp)="onThumbsUp($event)">
            
            <!-- Custom send button template -->
            <ng-template #sendButton let-send="send" let-disabled="disabled">
              <button 
                [disabled]="disabled"
                (click)="send()"
                style="background: linear-gradient(45deg, #667eea 0%, #764ba2 100%); 
                       color: white; 
                       padding: 8px 16px; 
                       border-radius: 20px; 
                       border: none;
                       cursor: pointer;
                       font-weight: bold;">
                ✨ Send Message
              </button>
            </ng-template>
            
            <!-- Custom thumbs up button template -->
            <ng-template #thumbsUpButton let-onClick="onClick">
              <button 
                (click)="onClick()"
                style="background: #10b981; 
                       color: white; 
                       padding: 4px 8px; 
                       border-radius: 4px; 
                       border: none;
                       cursor: pointer;">
                👍 Like
              </button>
            </ng-template>
          </copilot-chat-view>
        </div>
      `,
    })
    class StoryComponent {
      messages = messages;
      
      onThumbsUp(event: { message: Message }) {
        alert(`You liked message: "${event.message.content?.substring(0, 50)}..."`);
      }
    }

    return {
      component: StoryComponent,
      props: {},
    };
  },
};