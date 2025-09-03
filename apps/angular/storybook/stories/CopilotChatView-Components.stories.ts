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
import { CustomDisclaimerComponent } from "../components/custom-disclaimer.component";
import { CustomInputComponent } from "../components/custom-input.component";
import { CustomScrollButtonComponent } from "../components/custom-scroll-button.component";

const meta: Meta<CopilotChatViewComponent> = {
  title: "UI/CopilotChatView/Customized with Components",
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

export const CustomDisclaimer: Story = {
  render: () => {
    const messages: Message[] = [
      {
        id: "user-1",
        content: "Hello! Can you help me with TypeScript?",
        role: "user" as const,
      },
      {
        id: "assistant-1",
        content:
          "Of course! TypeScript is a superset of JavaScript that adds static typing. What would you like to know?",
        role: "assistant" as const,
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
    const messages: Message[] = [
      {
        id: "user-1",
        content: "Check out this custom input!",
        role: "user" as const,
      },
      {
        id: "assistant-1",
        content:
          "That's a beautiful custom input component! The gradient and styling look great.",
        role: "assistant" as const,
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
    // Generate many messages to show scroll behavior
    const messages: Message[] = [];
    for (let i = 0; i < 20; i++) {
      messages.push({
        id: `msg-${i}`,
        content: `Message ${i}: This is a test message to demonstrate the custom scroll button.`,
        role: i % 2 === 0 ? "user" : "assistant",
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
        id: "user-1",
        content: "Hello!",
        role: "user" as const,
      },
      {
        id: "assistant-1",
        content: "Hi there! How can I help you today?",
        role: "assistant" as const,
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
        messages,
      },
    };
  },
};
