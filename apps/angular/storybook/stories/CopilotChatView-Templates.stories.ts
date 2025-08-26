import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { CommonModule } from '@angular/common';
import {
  CopilotChatViewComponent,
  CopilotChatMessageViewComponent,
  CopilotChatInputComponent,
  provideCopilotChatConfiguration,
  provideCopilotKit,
} from '@copilotkit/angular';
import { Message } from '@ag-ui/client';

const meta: Meta<CopilotChatViewComponent> = {
  title: 'UI/CopilotChatView/Customized with Templates',
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

export const CustomDisclaimerTemplate: Story = {
  render: () => {
    const messages: Message[] = [
      {
        id: 'user-1',
        content: 'How do I use templates for customization?',
        role: 'user' as const,
      },
      {
        id: 'assistant-1',
        content: 'Templates provide a powerful way to customize components! You can use ng-template with template references to inject custom HTML directly into the component slots.',
        role: 'assistant' as const,
      },
    ];

    return {
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: hidden;">
          <!-- Custom Disclaimer Template -->
          <ng-template #customDisclaimer>
            <div style="
              text-align: center;
              padding: 16px;
              background: linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%);
              color: white;
              font-size: 14px;
              font-weight: 600;
              margin: 12px 20px;
              border-radius: 12px;
              box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
              position: relative;
              overflow: hidden;
            ">
              <div style="
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
                transform: rotate(45deg);
                animation: shimmer 3s infinite;
              "></div>
              <span style="position: relative; z-index: 1;">
                ⚡ Template-based customization - AI assistance at your fingertips!
              </span>
            </div>
          </ng-template>

          <copilot-chat-view
            [messages]="messages"
            [disclaimerTemplate]="customDisclaimer">
          </copilot-chat-view>
        </div>
      `,
      props: {
        messages,
      },
    };
  },
};

export const CustomInputTemplate: Story = {
  render: () => {
    const messages: Message[] = [
      {
        id: 'user-1',
        content: 'This input is created with a template!',
        role: 'user' as const,
      },
      {
        id: 'assistant-1',
        content: 'Yes! Templates allow for complete control over the input area, including custom styling and behavior.',
        role: 'assistant' as const,
      },
    ];

    const sendMessage = (input: HTMLInputElement, onSend: (message: string) => void) => {
      if (input.value.trim()) {
        onSend(input.value);
        input.value = '';
      }
    };

    const onInputFocus = (event: FocusEvent) => {
      const input = event.target as HTMLInputElement;
      input.style.borderColor = 'rgba(255, 255, 255, 0.8)';
      input.style.transform = 'scale(1.02)';
    };

    const onInputBlur = (event: FocusEvent) => {
      const input = event.target as HTMLInputElement;
      input.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      input.style.transform = 'scale(1)';
    };

    const onButtonHover = (event: MouseEvent, isHover: boolean) => {
      const button = event.target as HTMLButtonElement;
      if (isHover) {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15)';
      } else {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
      }
    };

    return {
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: hidden;">
          <!-- Custom Input Template -->
          <ng-template #customInput let-onSend="onSend">
            <div style="
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 24px;
              margin: 0;
              box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
            ">
              <div style="
                display: flex;
                gap: 12px;
                max-width: 1200px;
                margin: 0 auto;
              ">
                <input 
                  #messageInput
                  type="text"
                  placeholder="✨ Type your message here..."
                  style="
                    flex: 1;
                    padding: 16px 20px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-radius: 12px;
                    font-size: 16px;
                    background: rgba(255, 255, 255, 0.95);
                    color: #333;
                    outline: none;
                    transition: all 0.3s ease;
                  "
                  (keyup.enter)="sendMessage(messageInput, onSend)"
                  (focus)="onInputFocus($event)"
                  (blur)="onInputBlur($event)"
                />
                <button 
                  style="
                    padding: 16px 32px;
                    background: white;
                    color: #667eea;
                    border: none;
                    border-radius: 12px;
                    font-weight: bold;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                  "
                  (click)="sendMessage(messageInput, onSend)"
                  (mouseenter)="onButtonHover($event, true)"
                  (mouseleave)="onButtonHover($event, false)">
                  Send
                </button>
              </div>
              <div style="
                text-align: center;
                margin-top: 8px;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.8);
              ">
                Press Enter to send • Powered by Templates
              </div>
            </div>
          </ng-template>

          <copilot-chat-view
            [messages]="messages"
            [inputTemplate]="customInput">
          </copilot-chat-view>
        </div>
      `,
      props: {
        messages,
        sendMessage,
        onInputFocus,
        onInputBlur,
        onButtonHover,
      },
    };
  },
};

export const CustomScrollButtonTemplate: Story = {
  render: () => {
    // Generate many messages to show scroll behavior
    const messages: Message[] = [];
    for (let i = 0; i < 25; i++) {
      messages.push({
        id: `msg-${i}`,
        content: i % 2 === 0 
          ? `User message ${i}: Template-based scroll button demonstration!`
          : `Assistant response ${i}: Templates provide maximum flexibility for UI customization, allowing you to create exactly the experience you want.`,
        role: i % 2 === 0 ? 'user' : 'assistant',
      } as Message);
    }

    const handleScroll = (onClick: () => void) => {
      // Add a smooth animation effect before scrolling
      const button = document.querySelector('button') as HTMLElement;
      if (button) {
        button.style.animation = 'pulse 0.5s ease-out';
      }
      onClick();
      setTimeout(() => {
        if (button) {
          button.style.animation = '';
        }
      }, 500);
    };

    return {
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: hidden;">
          <!-- Custom Scroll Button Template -->
          <ng-template #customScrollButton let-onClick="onClick">
            <button 
              (click)="handleScroll(onClick)"
              (mouseenter)="isHovered = true"
              (mouseleave)="isHovered = false"
              style="
                position: fixed;
                bottom: 100px;
                right: 30px;
                width: 64px;
                height: 64px;
                border-radius: 50%;
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                border: 3px solid white;
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 1000;
              "
              [style.transform]="isHovered ? 'scale(1.15) rotate(360deg)' : 'scale(1) rotate(0deg)'"
              [style.opacity]="isHovered ? '1' : '0.9'">
              <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                color: white;
              ">
                <span style="font-size: 24px;">↓</span>
                <span style="font-size: 10px; margin-top: -4px;">SCROLL</span>
              </div>
            </button>
          </ng-template>

          <copilot-chat-view
            [messages]="messages"
            [autoScroll]="false"
            [scrollToBottomButtonTemplate]="customScrollButton">
          </copilot-chat-view>
        </div>
      `,
      props: {
        messages,
        handleScroll,
        isHovered: false,
      },
    };
  },
};

export const AllTemplatesCombined: Story = {
  render: () => {
    const messages: Message[] = [
      {
        id: 'user-1',
        content: 'Show me all templates working together!',
        role: 'user' as const,
      },
      {
        id: 'assistant-1',
        content: 'Here you can see custom disclaimer, input, and scroll button templates all working in harmony!',
        role: 'assistant' as const,
      },
      {
        id: 'user-2',
        content: 'This is amazing flexibility!',
        role: 'user' as const,
      },
      {
        id: 'assistant-2',
        content: 'Templates give you complete control over every aspect of the chat interface while maintaining the core functionality.',
        role: 'assistant' as const,
      },
    ];

    const send = (input: HTMLInputElement, onSend: (message: string) => void) => {
      if (input.value.trim()) {
        onSend(input.value);
        input.value = '';
      }
    };

    return {
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: hidden;">
          <!-- Combined Templates -->
          <ng-template #disclaimer>
            <div style="
              text-align: center;
              padding: 12px;
              background: linear-gradient(90deg, #00d2ff 0%, #3a47d5 100%);
              color: white;
              font-size: 13px;
              margin: 8px 16px;
              border-radius: 8px;
            ">
              🚀 All custom templates active!
            </div>
          </ng-template>

          <ng-template #input let-onSend="onSend">
            <div style="
              background: linear-gradient(90deg, #00d2ff 0%, #3a47d5 100%);
              padding: 20px;
            ">
              <input 
                #msgInput
                type="text"
                placeholder="Template-powered input..."
                style="
                  width: calc(100% - 100px);
                  padding: 12px;
                  border: 2px solid white;
                  border-radius: 8px;
                  font-size: 16px;
                  outline: none;
                "
                (keyup.enter)="send(msgInput, onSend)"
              />
              <button 
                style="
                  width: 80px;
                  padding: 12px;
                  margin-left: 10px;
                  background: white;
                  color: #3a47d5;
                  border: none;
                  border-radius: 8px;
                  font-weight: bold;
                  cursor: pointer;
                "
                (click)="send(msgInput, onSend)">
                Go
              </button>
            </div>
          </ng-template>

          <ng-template #scrollBtn let-onClick="onClick">
            <button 
              (click)="onClick()"
              style="
                position: fixed;
                bottom: 90px;
                right: 20px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: linear-gradient(90deg, #00d2ff 0%, #3a47d5 100%);
                border: 2px solid white;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                cursor: pointer;
                color: white;
                font-size: 20px;
              ">
              ↓
            </button>
          </ng-template>

          <copilot-chat-view
            [messages]="messages"
            [autoScroll]="false"
            [disclaimerTemplate]="disclaimer"
            [inputTemplate]="input"
            [scrollToBottomButtonTemplate]="scrollBtn">
          </copilot-chat-view>
        </div>
      `,
      props: {
        messages,
        send,
      },
    };
  },
};