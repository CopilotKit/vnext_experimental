import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  CopilotChatViewComponent,
  CopilotChatMessageViewComponent,
  CopilotChatInputComponent,
  provideCopilotChatConfiguration,
  provideCopilotKit,
} from '@copilotkit/angular';
import { Message } from '@ag-ui/client';

const meta: Meta<CopilotChatViewComponent> = {
  title: 'UI/CopilotChatView/Custom Actions',
  component: CopilotChatViewComponent,
  decorators: [
    moduleMetadata({
      imports: [
        CommonModule,
        CopilotChatViewComponent,
        CopilotChatMessageViewComponent,
        CopilotChatInputComponent,
      ],
      providers: [
        provideCopilotKit({}),
        provideCopilotChatConfiguration({
          labels: {
            chatInputPlaceholder: 'Type a message...',
            chatDisclaimerText: 'AI can make mistakes. Please verify important information.',
          },
        }),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<CopilotChatViewComponent>;

export const ThumbsUpDown: Story = {
  render: () => {
    // Custom disclaimer component
    @Component({
      selector: 'custom-disclaimer',
      standalone: true,
      template: `
        <div [class]="inputClass" style="
          text-align: center;
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-size: 14px;
          margin: 8px 16px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        ">
          🎨 This chat interface is fully customizable!
        </div>
      `
    })
    class CustomDisclaimerComponent {
      // Accept slot-provided inputs to avoid NG0303
      @Input() text?: string;
      @Input() inputClass?: string;
    }

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

    const onThumbsUp = (event: any) => {
      console.log('Thumbs up!', event);
      alert('You liked this message!');
    };

    const onThumbsDown = (event: any) => {
      console.log('Thumbs down!', event);  
      alert('You disliked this message!');
    };

    return {
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: hidden;">
          <copilot-chat-view
            [messages]="messages"
            [disclaimerComponent]="customDisclaimerComponent"
            (assistantMessageThumbsUp)="onThumbsUp($event)"
            (assistantMessageThumbsDown)="onThumbsDown($event)">
          </copilot-chat-view>
        </div>
      `,
      props: {
        messages,
        customDisclaimerComponent: CustomDisclaimerComponent,
        onThumbsUp,
        onThumbsDown,
      },
    };
  },
};
