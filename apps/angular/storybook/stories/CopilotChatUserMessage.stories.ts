import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { fn } from '@storybook/test';
import { 
  CopilotChatUserMessageComponent,
  provideCopilotChatConfiguration,
  type UserMessage,
  type CopilotChatUserMessageOnEditMessageProps,
  type CopilotChatUserMessageOnSwitchToBranchProps
} from '@copilotkit/angular';

// Sample messages for stories
const simpleMessage: UserMessage = {
  id: 'simple-user-message',
  content: 'Hello! Can you help me build an Angular component?',
  role: 'user',
  timestamp: new Date()
};

const longMessage: UserMessage = {
  id: 'long-user-message',
  content: `I need help with creating a complex Angular component that handles user authentication. Here are my requirements:

1. The component should have login and signup forms
2. It needs to integrate with Firebase Auth
3. Should handle form validation
4. Must be responsive and work on mobile
5. Include forgot password functionality
6. Support social login (Google, GitHub)

Can you help me implement this step by step? I'm particularly struggling with the form validation and state management parts.`,
  role: 'user',
  timestamp: new Date()
};

const codeMessage: UserMessage = {
  id: 'code-user-message',
  content: `I'm getting this error in my Angular app:

TypeError: Cannot read property 'map' of undefined

The error happens in this component:

@Component({
  selector: 'app-user-list',
  template: \`
    <div *ngFor="let user of users">
      {{ user.name }}
    </div>
  \`
})
export class UserListComponent {
  @Input() users: User[];
}

How can I fix this?`,
  role: 'user',
  timestamp: new Date()
};

const shortMessage: UserMessage = {
  id: 'short-user-message',
  content: "What's the difference between signals and observables in Angular?",
  role: 'user',
  timestamp: new Date()
};

// Custom button component for demonstrations
@Component({
  selector: 'custom-copy-button',
  standalone: true,
  template: `
    <button
      (click)="handleClick()"
      class="h-8 w-8 p-0 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-600 flex items-center justify-center transition-colors"
      title="Copy message">
      📋
    </button>
  `
})
class CustomCopyButtonComponent {
  @Output() click = new EventEmitter<void>();
  
  handleClick(): void {
    this.click.emit();
  }
}

const meta: Meta<CopilotChatUserMessageComponent> = {
  title: 'UI/CopilotChatUserMessage',
  component: CopilotChatUserMessageComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [CommonModule, CopilotChatUserMessageComponent, CustomCopyButtonComponent],
      providers: [
        provideCopilotChatConfiguration({
          labels: {
            userMessageToolbarCopyMessageLabel: 'Copy',
            userMessageToolbarEditMessageLabel: 'Edit'
          }
        })
      ],
    }),
  ],
  render: (args) => ({
    props: {
      ...args,
      editMessage: fn(),
      switchToBranch: fn(),
    },
    template: `
      <div style="display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 16px; background: #f5f5f5;">
        <div style="width: 100%; max-width: 640px;">
          <copilot-chat-user-message
            [message]="message"
            [branchIndex]="branchIndex"
            [numberOfBranches]="numberOfBranches"
            [inputClass]="inputClass"
            [messageRendererSlot]="messageRendererSlot"
            [copyButtonSlot]="copyButtonSlot"
            [editButtonSlot]="editButtonSlot"
            [additionalToolbarItems]="additionalToolbarItems"
            (editMessage)="editMessage($event)"
            (switchToBranch)="switchToBranch($event)"
          ></copilot-chat-user-message>
        </div>
      </div>
    `,
  }),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
The CopilotChatUserMessage component displays user messages in a chat interface with rich features.

## Features
- 📝 Message content display with proper formatting
- 📋 Copy to clipboard functionality with visual feedback
- ✏️ Edit message capability
- 🔀 Branch navigation for message variations
- 🎨 Fully customizable via slots and templates
- 🌙 Dark/light theme support
- ♿ Accessible with ARIA labels

## Basic Usage

\`\`\`typescript
import { CopilotChatUserMessageComponent } from '@copilotkit/angular';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CopilotChatUserMessageComponent],
  template: \`
    <copilot-chat-user-message
      [message]="userMessage"
      (editMessage)="onEditMessage($event)"
    ></copilot-chat-user-message>
  \`
})
export class ChatComponent {
  userMessage = {
    id: 'msg-1',
    content: 'Hello, world!',
    role: 'user'
  };
  
  onEditMessage(event: CopilotChatUserMessageOnEditMessageProps): void {
    console.log('Edit message:', event.message);
  }
}
\`\`\`

## Customization

The component supports extensive customization through:
- **Slots**: Replace default UI elements with custom components
- **Templates**: Use ng-template for fine-grained control
- **Props**: Configure behavior and appearance
- **Styling**: Apply custom CSS classes

See individual stories below for detailed examples of each customization approach.
        `
      }
    }
  },
  argTypes: {
    message: {
      description: 'The user message to display',
      table: {
        type: { summary: 'UserMessage' },
        category: 'Data'
      }
    },
    branchIndex: {
      control: { type: 'number', min: 0 },
      description: 'Current branch index for message variations',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '0' },
        category: 'Branch Navigation'
      }
    },
    numberOfBranches: {
      control: { type: 'number', min: 1 },
      description: 'Total number of message branches',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '1' },
        category: 'Branch Navigation'
      }
    },
    inputClass: {
      control: { type: 'text' },
      description: 'Custom CSS class for the message container',
      table: {
        type: { summary: 'string' },
        category: 'Appearance'
      }
    },
    additionalToolbarItems: {
      description: 'Additional toolbar items to display',
      table: {
        type: { summary: 'TemplateRef' },
        category: 'Customization'
      }
    }
  },
  args: {
    message: simpleMessage
  }
};

export default meta;
type Story = StoryObj<CopilotChatUserMessageComponent>;

// 1. Default story
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Basic user message display with copy functionality.'
      }
    }
  }
};

// 2. Long Message
export const LongMessage: Story = {
  args: {
    message: longMessage
  },
  parameters: {
    docs: {
      description: {
        story: 'A longer message demonstrating text wrapping and multiline display.'
      }
    }
  }
};

// 3. With Edit Button
export const WithEditButton: Story = {
  args: {
    message: simpleMessage
  },
  render: (args) => ({
    props: {
      ...args,
      editMessage: (event: CopilotChatUserMessageOnEditMessageProps) => {
        console.log('Edit message:', event.message);
        alert(`Edit message: ${event.message.content}`);
      }
    },
    template: `
      <div style="display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 16px; background: #f5f5f5;">
        <div style="width: 100%; max-width: 640px;">
          <copilot-chat-user-message
            [message]="message"
            (editMessage)="editMessage($event)"
          ></copilot-chat-user-message>
        </div>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: 'Message with edit functionality. The edit button appears when an editMessage handler is provided.'
      }
    }
  }
};

// 4. Without Edit Button
export const WithoutEditButton: Story = {
  args: {
    message: simpleMessage
  },
  parameters: {
    docs: {
      description: {
        story: 'Message without edit capability. No edit button is shown when editMessage handler is not provided.'
      }
    }
  }
};

// 5. Code Related Message
export const CodeRelatedMessage: Story = {
  args: {
    message: codeMessage
  },
  parameters: {
    docs: {
      description: {
        story: 'Message containing code snippets with proper formatting and spacing.'
      }
    }
  }
};

// 6. Short Question
export const ShortQuestion: Story = {
  args: {
    message: shortMessage
  },
  parameters: {
    docs: {
      description: {
        story: 'A brief question demonstrating compact message display.'
      }
    }
  }
};

// 7. With Additional Toolbar Items
export const WithAdditionalToolbarItems: Story = {
  render: () => ({
    props: {
      message: simpleMessage,
      editMessage: fn(),
      onCustomAction1: () => alert('Custom action 1 clicked!'),
      onCustomAction2: () => alert('Custom action 2 clicked!')
    },
    template: `
      <ng-template #additionalItems>
        <button
          class="h-8 w-8 p-0 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
          (click)="onCustomAction1()"
          title="Custom Action 1">
          📎
        </button>
        <button
          class="h-8 w-8 p-0 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
          (click)="onCustomAction2()"
          title="Custom Action 2">
          🔄
        </button>
      </ng-template>
      
      <div style="display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 16px; background: #f5f5f5;">
        <div style="width: 100%; max-width: 640px;">
          <copilot-chat-user-message
            [message]="message"
            [additionalToolbarItems]="additionalItems"
            (editMessage)="editMessage($event)"
          ></copilot-chat-user-message>
        </div>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: `
Add custom toolbar buttons alongside the default tools.

\`\`\`html
<ng-template #additionalItems>
  <button class="custom-btn" (click)="onAction()">📎</button>
  <button class="custom-btn" (click)="onAction2()">🔄</button>
</ng-template>

<copilot-chat-user-message 
  [additionalToolbarItems]="additionalItems">
</copilot-chat-user-message>
\`\`\`
        `
      }
    }
  }
};

// 8. Custom Appearance
export const CustomAppearance: Story = {
  args: {
    message: simpleMessage,
    inputClass: 'bg-blue-50 border border-blue-200 rounded-lg p-4'
  },
  render: () => ({
    props: {
      message: simpleMessage,
      editMessage: fn()
    },
    template: `
      <ng-template #messageRenderer let-content="content">
        <div class="prose dark:prose-invert bg-blue-100 max-w-[80%] rounded-[18px] px-4 py-3 inline-block whitespace-pre-wrap text-blue-900 font-medium">
          💬 {{ content }}
        </div>
      </ng-template>
      
      <ng-template #copyButton let-onClick="onClick">
        <button
          class="h-8 w-8 p-0 rounded-md text-blue-600 hover:bg-blue-100 flex items-center justify-center"
          (click)="onClick()">
          📋
        </button>
      </ng-template>
      
      <div style="display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 16px; background: #f5f5f5;">
        <div style="width: 100%; max-width: 640px;">
          <copilot-chat-user-message
            [message]="message"
            (editMessage)="editMessage($event)">
            <ng-template #messageRenderer let-content="content">
              <div class="prose dark:prose-invert bg-blue-100 max-w-[80%] rounded-[18px] px-4 py-3 inline-block whitespace-pre-wrap text-blue-900 font-medium">
                💬 {{ content }}
              </div>
            </ng-template>
            <ng-template #copyButton let-onClick="onClick">
              <button
                class="h-8 w-8 p-0 rounded-md text-blue-600 hover:bg-blue-100 flex items-center justify-center"
                (click)="onClick()">
                📋
              </button>
            </ng-template>
          </copilot-chat-user-message>
        </div>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: 'Customize the appearance using template slots for complete control over the UI.'
      }
    }
  }
};

// 9. Custom Components
export const CustomComponents: Story = {
  render: () => ({
    props: {
      message: simpleMessage,
      editMessage: fn()
    },
    template: `
      <div style="display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 16px; background: linear-gradient(to br, #fef3c7, #fde68a);">
        <div style="width: 100%; max-width: 640px;">
          <copilot-chat-user-message
            [message]="message"
            inputClass="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4 shadow-sm"
            (editMessage)="editMessage($event)">
            <ng-template #messageRenderer let-content="content">
              <div class="font-mono text-purple-800 bg-white/50 rounded-lg px-3 py-2 inline-block">
                💬 {{ content }}
              </div>
            </ng-template>
          </copilot-chat-user-message>
        </div>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: 'Example with fully customized components and gradient backgrounds.'
      }
    }
  }
};

// 10. Using Template Slots
export const UsingTemplateSlot: Story = {
  args: {
    message: longMessage
  },
  render: () => ({
    props: {
      message: longMessage,
      editMessage: fn(),
      copyAction: async () => {
        await navigator.clipboard.writeText(longMessage.content || '');
        alert('Copied to clipboard!');
      }
    },
    template: `
      <div style="display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 16px; background: #f5f5f5;">
        <div style="width: 100%; max-width: 640px;">
          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <copilot-chat-user-message
              [message]="message"
              (editMessage)="editMessage($event)">
              <ng-template #toolbar>
                <div class="flex items-center gap-2 mt-2">
                  <button
                    class="px-3 py-1 bg-yellow-200 hover:bg-yellow-300 rounded text-sm"
                    (click)="copyAction()">
                    Copy
                  </button>
                  <button
                    class="px-3 py-1 bg-yellow-200 hover:bg-yellow-300 rounded text-sm"
                    (click)="editMessage({message: message})">
                    Edit
                  </button>
                </div>
              </ng-template>
            </copilot-chat-user-message>
            <div class="mt-2 text-xs text-yellow-700">
              Custom layout using template slots
            </div>
          </div>
        </div>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: `
Use template slots to completely customize the layout and behavior.

\`\`\`html
<copilot-chat-user-message [message]="message">
  <ng-template #toolbar>
    <!-- Custom toolbar content -->
  </ng-template>
  <ng-template #messageRenderer let-content="content">
    <!-- Custom message renderer -->
  </ng-template>
</copilot-chat-user-message>
\`\`\`
        `
      }
    }
  }
};

// 11. With Branch Navigation
export const WithBranchNavigation: Story = {
  args: {
    message: {
      id: 'branch-message',
      content: 'This message has multiple branches. You can navigate between them using the branch controls.',
      role: 'user'
    },
    branchIndex: 1,
    numberOfBranches: 3
  },
  render: (args) => ({
    props: {
      ...args,
      editMessage: fn(),
      switchToBranch: (event: CopilotChatUserMessageOnSwitchToBranchProps) => {
        console.log(`Switching to branch ${event.branchIndex + 1} of ${event.numberOfBranches}`);
        alert(`Would switch to branch ${event.branchIndex + 1} of ${event.numberOfBranches}`);
      }
    },
    template: `
      <div style="display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 16px; background: #f5f5f5;">
        <div style="width: 100%; max-width: 640px;">
          <copilot-chat-user-message
            [message]="message"
            [branchIndex]="branchIndex"
            [numberOfBranches]="numberOfBranches"
            (editMessage)="editMessage($event)"
            (switchToBranch)="switchToBranch($event)"
          ></copilot-chat-user-message>
        </div>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: `
Message with branch navigation controls for switching between message variations.

\`\`\`typescript
<copilot-chat-user-message
  [message]="message"
  [branchIndex]="1"
  [numberOfBranches]="3"
  (switchToBranch)="onSwitchBranch($event)">
</copilot-chat-user-message>
\`\`\`
        `
      }
    }
  }
};

// 12. With Many Branches
export const WithManyBranches: Story = {
  args: {
    message: {
      id: 'many-branches-message',
      content: 'This is branch 5 of 10. Use the navigation arrows to explore different variations of this message.',
      role: 'user'
    },
    branchIndex: 4,
    numberOfBranches: 10
  },
  render: (args) => ({
    props: {
      ...args,
      editMessage: fn(),
      switchToBranch: (event: CopilotChatUserMessageOnSwitchToBranchProps) => {
        console.log(`Switching to branch ${event.branchIndex + 1} of ${event.numberOfBranches}`);
        alert(`Would switch to branch ${event.branchIndex + 1} of ${event.numberOfBranches}`);
      }
    },
    template: `
      <div style="display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 16px; background: #f5f5f5;">
        <div style="width: 100%; max-width: 640px;">
          <copilot-chat-user-message
            [message]="message"
            [branchIndex]="branchIndex"
            [numberOfBranches]="numberOfBranches"
            (editMessage)="editMessage($event)"
            (switchToBranch)="switchToBranch($event)"
          ></copilot-chat-user-message>
        </div>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: 'Example with many branches demonstrating the navigation counter display.'
      }
    }
  }
};

// 13. Custom Copy Button Component
export const CustomCopyButtonComponentStory: Story = {
  decorators: [
    moduleMetadata({
      imports: [CommonModule, CopilotChatUserMessageComponent, CustomCopyButtonComponent],
      providers: [
        provideCopilotChatConfiguration({
          labels: {
            userMessageToolbarCopyMessageLabel: 'Copy',
            userMessageToolbarEditMessageLabel: 'Edit'
          }
        })
      ],
    }),
  ],
  render: () => ({
    props: {
      message: simpleMessage,
      editMessage: fn(),
      CopyButton: CustomCopyButtonComponent
    },
    template: `
      <div style="display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 16px; background: #f5f5f5;">
        <div style="width: 100%; max-width: 640px;">
          <copilot-chat-user-message
            [message]="message"
            [copyButtonSlot]="CopyButton"
            (editMessage)="editMessage($event)">
          </copilot-chat-user-message>
        </div>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: `
Pass a custom component class directly for the copy button.

\`\`\`typescript
// In component:
CopyButton = CustomCopyButtonComponent;

// In template:
<copilot-chat-user-message 
  [copyButtonSlot]="CopyButton">
</copilot-chat-user-message>
\`\`\`
        `
      }
    }
  }
};