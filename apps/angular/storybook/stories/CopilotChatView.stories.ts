import type { Meta, StoryObj } from "@storybook/angular";
import { moduleMetadata } from "@storybook/angular";
import { CommonModule } from "@angular/common";
import {
  CopilotChatViewComponent,
  CopilotChatMessageViewComponent,
  CopilotChatInputComponent,
  provideCopilotChatConfiguration,
  provideCopilotKit,
} from "@copilotkitnext/angular";
import { Message } from "@ag-ui/client";

const meta: Meta<CopilotChatViewComponent> = {
  title: "UI/CopilotChatView/Basic Examples",
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
            chatInputPlaceholder: "Type a message...",
            chatDisclaimerText:
              "AI can make mistakes. Please verify important information.",
          },
        }),
      ],
    }),
  ],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<CopilotChatViewComponent>;

// Default story
export const Default: Story = {
  render: () => {
    const messages: Message[] = [
      {
        id: "user-1",
        content: "Hello! How can I integrate CopilotKit with my Angular app?",
        role: "user" as const,
      },
      {
        id: "assistant-1",
        content: `To integrate CopilotKit with your Angular app, follow these steps:

1. Install the package:
\`\`\`bash
npm install @copilotkitnext/angular
\`\`\`

2. Import and configure in your component:
\`\`\`typescript
import { provideCopilotKit } from '@copilotkitnext/angular';

@Component({
  providers: [provideCopilotKit({})]
})
\`\`\`

3. Use the chat components in your template!`,
        role: "assistant" as const,
      },
      {
        id: "user-2",
        content: "That looks great! Can I customize the appearance?",
        role: "user" as const,
      },
      {
        id: "assistant-2",
        content:
          "Yes! CopilotKit is highly customizable. You can customize the appearance using Tailwind CSS classes or by providing your own custom components through the slot system.",
        role: "assistant" as const,
      },
    ];

    const onThumbsUp = (event: any) => {
      alert("Thumbs up! You liked this message.");
      console.log("Thumbs up event:", event);
    };

    const onThumbsDown = (event: any) => {
      alert("Thumbs down! You disliked this message.");
      console.log("Thumbs down event:", event);
    };

    return {
      template: `
        <div style="height: 100vh; margin: 0; padding: 0; overflow: hidden;">
          <copilot-chat-view
            [messages]="messages"
            (assistantMessageThumbsUp)="onThumbsUp($event)"
            (assistantMessageThumbsDown)="onThumbsDown($event)">
          </copilot-chat-view>
        </div>
      `,
      props: {
        messages,
        onThumbsUp,
        onThumbsDown,
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
          role: "user" as const,
        });
      } else {
        messages.push({
          id: `assistant-${i}`,
          content: `Assistant response ${i}: This is a longer response to demonstrate how the chat interface handles various message lengths and scrolling behavior when there are many messages in the conversation.`,
          role: "assistant" as const,
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
        messages,
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
            [messages]="[]">
          </copilot-chat-view>
        </div>
      `,
      props: {},
    };
  },
};
