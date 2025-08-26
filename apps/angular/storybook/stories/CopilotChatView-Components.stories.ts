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
  title: 'UI/CopilotChatView/Customized with Components',
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

export const CustomDisclaimer: Story = {
  render: () => {
    // Custom disclaimer component
    @Component({
      selector: 'custom-disclaimer',
      standalone: true,
      template: `
        <div style="
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
    class CustomDisclaimerComponent {}

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

    return {
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: hidden;">
          <copilot-chat-view
            [messages]="messages"
            [disclaimerComponent]="customDisclaimerComponent">
          </copilot-chat-view>
        </div>
      `,
      props: {
        messages,
        customDisclaimerComponent: CustomDisclaimerComponent,
      },
    };
  },
};

export const CustomInput: Story = {
  render: () => {
    // Custom input component
    @Component({
      selector: 'custom-input',
      standalone: true,
      imports: [CommonModule],
      template: `
        <div style="
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          padding: 20px;
          border-radius: 15px;
          margin: 10px;
        ">
          <input 
            type="text"
            placeholder="💬 Ask me anything..."
            style="
              width: 100%;
              padding: 15px;
              border: 2px solid white;
              border-radius: 10px;
              font-size: 16px;
              background: rgba(255, 255, 255, 0.9);
              color: #333;
              outline: none;
            "
            (keyup.enter)="handleSend($event)"
          />
          <button 
            style="
              margin-top: 10px;
              padding: 10px 20px;
              background: white;
              color: #f5576c;
              border: none;
              border-radius: 5px;
              font-weight: bold;
              cursor: pointer;
            "
            (click)="handleSendClick()">
            Send Message ✨
          </button>
        </div>
      `,
    })
    class CustomInputComponent {
      @Input() onSend?: (message: string) => void;
      
      handleSend(event: any) {
        const value = event.target.value;
        if (value && this.onSend) {
          this.onSend(value);
          event.target.value = '';
        }
      }
      
      handleSendClick() {
        const input = document.querySelector('input') as HTMLInputElement;
        if (input?.value && this.onSend) {
          this.onSend(input.value);
          input.value = '';
        }
      }
    }

    const messages: Message[] = [
      {
        id: 'user-1',
        content: 'Check out this custom input!',
        role: 'user' as const,
      },
      {
        id: 'assistant-1',
        content: 'That\'s a beautiful custom input component! The gradient and styling look great.',
        role: 'assistant' as const,
      },
    ];

    return {
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: hidden;">
          <copilot-chat-view
            [messages]="messages"
            [inputComponent]="customInputComponent">
          </copilot-chat-view>
        </div>
      `,
      props: {
        messages,
        customInputComponent: CustomInputComponent,
      },
    };
  },
};

export const CustomScrollButton: Story = {
  render: () => {
    // Custom scroll-to-bottom button
    @Component({
      selector: 'custom-scroll-button',
      standalone: true,
      imports: [CommonModule],
      template: `
        <button 
          (click)="handleClick()"
          style="
            position: fixed;
            bottom: 100px;
            right: 20px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s;
          "
          (mouseenter)="onHover(true)"
          (mouseleave)="onHover(false)"
          [style.transform]="isHovered ? 'scale(1.1)' : 'scale(1)'">
          <span style="color: white; font-size: 24px;">⬇️</span>
        </button>
      `,
    })
    class CustomScrollButtonComponent {
      @Input() onClick?: () => void;
      isHovered = false;
      
      handleClick() {
        if (this.onClick) {
          this.onClick();
        }
      }
      
      onHover(state: boolean) {
        this.isHovered = state;
      }
    }

    // Generate many messages to show scroll behavior
    const messages: Message[] = [];
    for (let i = 0; i < 20; i++) {
      messages.push({
        id: `msg-${i}`,
        content: `Message ${i}: This is a test message to demonstrate the custom scroll button.`,
        role: i % 2 === 0 ? 'user' : 'assistant',
      } as Message);
    }

    return {
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: hidden;">
          <copilot-chat-view
            [messages]="messages"
            [autoScroll]="false"
            [scrollToBottomButtonComponent]="scrollToBottomButtonComponent">
          </copilot-chat-view>
        </div>
      `,
      props: {
        messages,
        scrollToBottomButtonComponent: CustomScrollButtonComponent,
      },
    };
  },
};

export const NoFeatherEffect: Story = {
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