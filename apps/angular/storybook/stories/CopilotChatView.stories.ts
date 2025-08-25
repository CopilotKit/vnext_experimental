import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { CommonModule } from '@angular/common';
import { Component, Input, ViewChild, TemplateRef } from '@angular/core';
import {
  CopilotChatViewComponent,
  CopilotChatMessageViewComponent,
  CopilotChatInputComponent,
  provideCopilotChatConfiguration,
  provideCopilotKit,
} from '@copilotkit/angular';
import { Message } from '@ag-ui/client';

const meta: Meta<CopilotChatViewComponent> = {
  title: 'UI/CopilotChatView',
  component: CopilotChatViewComponent,
  tags: ['autodocs'],
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

// Default story
export const Default: Story = {
  render: () => {
    const messages: Message[] = [
      {
        id: 'user-1',
        content: 'Hello! How can I integrate CopilotKit with my Angular app?',
        role: 'user' as const,
      },
      {
        id: 'assistant-1',
        content: `To integrate CopilotKit with your Angular app, follow these steps:

1. Install the package:
\`\`\`bash
npm install @copilotkit/angular
\`\`\`

2. Import and configure in your component:
\`\`\`typescript
import { provideCopilotKit } from '@copilotkit/angular';

@Component({
  providers: [provideCopilotKit({})]
})
\`\`\`

3. Use the chat components in your template!`,
        role: 'assistant' as const,
      },
      {
        id: 'user-2',
        content: 'That looks great! Can I customize the appearance?',
        role: 'user' as const,
      },
      {
        id: 'assistant-2',
        content: 'Yes! CopilotKit is highly customizable. You can customize the appearance using Tailwind CSS classes or by providing your own custom components through the slot system.',
        role: 'assistant' as const,
      },
    ];

    return {
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: hidden;">
          <copilot-chat-view
            [messages]="messages"
            [autoScroll]="true">
          </copilot-chat-view>
        </div>
      `,
      props: {
        messages
      },
    };
  },
};

// Story with manual scroll
export const ManualScroll: Story = {
  render: () => {
    // Generate many messages to show scroll behavior
    const messages: Message[] = [];
    for (let i = 0; i < 20; i++) {
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
            [disclaimerText]="'This is a custom disclaimer message for your chat interface.'">
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

// Story with custom disclaimer component
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

export const WithCustomDisclaimer: Story = {
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

    return {
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: hidden;">
          <copilot-chat-view
            [messages]="messages"
            [autoScroll]="true"
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

// Story wrapper component for event handling
@Component({
  selector: 'story-with-feedback',
  standalone: true,
  imports: [CommonModule, CopilotChatViewComponent],
  template: `
    <div style="height: 100vh; margin: 0; padding: 0; overflow: hidden;">
      <copilot-chat-view
        [messages]="messages"
        [autoScroll]="true"
        [disclaimerComponent]="customDisclaimerComponent"
        (assistantMessageThumbsUp)="onThumbsUp($event)"
        (assistantMessageThumbsDown)="onThumbsDown($event)">
      </copilot-chat-view>
    </div>
  `
})
class StoryWithFeedbackComponent {
  messages: Message[] = [
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
  
  customDisclaimerComponent = CustomDisclaimerComponent;
  
  onThumbsUp(event: any) {
    console.log('Thumbs up!', event);
    alert('You liked this message!');
  }
  
  onThumbsDown(event: any) {
    console.log('Thumbs down!', event);  
    alert('You disliked this message!');
  }
}

export const WithCustomDisclaimerAndFeedback: Story = {
  decorators: [
    moduleMetadata({
      imports: [CommonModule, CopilotChatViewComponent, StoryWithFeedbackComponent],
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
  render: () => ({
    template: `<story-with-feedback></story-with-feedback>`,
    props: {}
  }),
  parameters: {
    docs: {
      source: {
        type: 'code',
        code: `// Complete working example with custom disclaimer and feedback handlers
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopilotChatViewComponent } from '@copilotkit/angular';
import { Message } from '@ag-ui/client';

// Custom disclaimer component
@Component({
  selector: 'custom-disclaimer',
  standalone: true,
  template: \`
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
  \`
})
class CustomDisclaimerComponent {}

// Main chat component with feedback handlers
@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, CopilotChatViewComponent],
  template: \`
    <div style="height: 100vh; margin: 0; padding: 0; overflow: hidden;">
      <copilot-chat-view
        [messages]="messages"
        [autoScroll]="true"
        [disclaimerComponent]="customDisclaimerComponent"
        (assistantMessageThumbsUp)="onThumbsUp($event)"
        (assistantMessageThumbsDown)="onThumbsDown($event)">
      </copilot-chat-view>
    </div>
  \`
})
export class ChatComponent {
  messages: Message[] = [
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
  
  customDisclaimerComponent = CustomDisclaimerComponent;
  
  onThumbsUp(event: any) {
    console.log('Thumbs up!', event);
    alert('You liked this message!');
  }
  
  onThumbsDown(event: any) {
    console.log('Thumbs down!', event);
    alert('You disliked this message!');
  }
}`,
        language: 'typescript',
      },
    },
  },
};

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

export const WithCustomInput: Story = {
  render: () => {
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
            [autoScroll]="true"
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

export const WithCustomScrollButton: Story = {
  render: () => {
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