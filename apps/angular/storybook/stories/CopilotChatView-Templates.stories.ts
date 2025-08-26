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

// Placeholder story - template customization coming soon
export const ComingSoon: Story = {
  render: () => {
    const messages: Message[] = [
      {
        id: 'user-1',
        content: 'Can I customize the chat using templates?',
        role: 'user' as const,
      },
      {
        id: 'assistant-1',
        content: 'Template customization examples are coming soon! Stay tuned for advanced template-based customization options.',
        role: 'assistant' as const,
      },
    ];

    return {
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: hidden;">
          <copilot-chat-view
            [messages]="messages">
          </copilot-chat-view>
        </div>
      `,
      props: {
        messages
      },
    };
  },
};