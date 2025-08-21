import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { CommonModule } from '@angular/common';
import { 
  CopilotChatUserMessageComponent,
  provideCopilotChatConfiguration,
  type UserMessage,
} from '@copilotkit/angular';

// Simple default message
const simpleMessage: UserMessage = {
  id: 'simple-user-message',
  content: 'Hello! Can you help me build an Angular component?',
  role: 'user',
  timestamp: new Date()
};

// Longer user message
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

// Code-related user message
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

// Short question
const shortMessage: UserMessage = {
  id: 'short-user-message',
  content: "What's the difference between signals and observables in Angular?",
  role: 'user',
  timestamp: new Date()
};

const meta: Meta<CopilotChatUserMessageComponent> = {
  title: 'UI/CopilotChatUserMessage',
  component: CopilotChatUserMessageComponent,
  decorators: [
    moduleMetadata({
      imports: [CommonModule, CopilotChatUserMessageComponent],
      providers: [
        provideCopilotChatConfiguration({})
      ],
    }),
  ],
  render: (args) => ({
    props: {
      ...args,
    },
    template: `
      <div style="display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 16px;">
        <div style="width: 100%; max-width: 640px;">
          <copilot-chat-user-message
            [message]="message"
            [branchIndex]="branchIndex"
            [numberOfBranches]="numberOfBranches"
            [inputClass]="inputClass"
            [additionalToolbarItems]="additionalToolbarItems"
            (editMessage)="editMessage && editMessage($event)"
            (switchToBranch)="switchToBranch && switchToBranch($event)"
          ></copilot-chat-user-message>
        </div>
      </div>
    `,
  }),
  args: {
    message: simpleMessage,
    editMessage: () => console.log('Edit clicked!'),
  },
};

export default meta;
type Story = StoryObj<CopilotChatUserMessageComponent>;

export const Default: Story = {};

export const LongMessage: Story = {
  args: {
    message: longMessage,
  },
};

export const WithEditButton: Story = {
  args: {
    message: simpleMessage,
    editMessage: () => alert('Edit message clicked!'),
  },
};

export const WithoutEditButton: Story = {
  args: {
    message: simpleMessage,
    editMessage: undefined,
  },
};

export const CodeRelatedMessage: Story = {
  args: {
    message: codeMessage,
    editMessage: () => alert('Edit code message clicked!'),
  },
};

export const ShortQuestion: Story = {
  args: {
    message: shortMessage,
    editMessage: () => console.log('Edit short message clicked!'),
  },
};

export const WithAdditionalToolbarItems: Story = {
  render: () => ({
    props: {
      message: simpleMessage,
      editMessage: () => console.log('Edit clicked!'),
    },
    template: `
      <ng-template #additionalItems>
        <button
          class="h-8 w-8 p-0 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
          (click)="alert('Custom button 1 clicked!')"
          title="Custom Action 1">
          📎
        </button>
        <button
          class="h-8 w-8 p-0 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
          (click)="alert('Custom button 2 clicked!')"
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
};

export const CustomAppearance: Story = {
  args: {
    message: simpleMessage,
    editMessage: () => console.log('Edit clicked!'),
    inputClass: 'bg-blue-50 border border-blue-200 rounded-lg p-4',
  },
  render: () => ({
    props: {
      message: simpleMessage,
      editMessage: () => console.log('Edit clicked!'),
    },
    template: `
      <ng-template #messageRenderer let-content="content">
        <div class="prose dark:prose-invert bg-muted relative max-w-[80%] rounded-[18px] px-4 py-1.5 data-[multiline]:py-3 inline-block whitespace-pre-wrap text-blue-900 font-medium">
          {{ content }}
        </div>
      </ng-template>
      
      <ng-template #toolbar>
        <div class="w-full bg-transparent flex items-center justify-end -mr-[5px] mt-[8px] invisible group-hover:visible">
          <div class="flex items-center gap-1 justify-end">
            <button
              class="h-8 w-8 p-0 rounded-md text-blue-600 hover:bg-blue-100 flex items-center justify-center"
              (click)="handleCopy()">
              📋
            </button>
            <button
              class="h-8 w-8 p-0 rounded-md text-blue-600 hover:bg-blue-100 flex items-center justify-center"
              (click)="editMessage({message: message})">
              ✏️
            </button>
          </div>
        </div>
      </ng-template>
      
      <div style="display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 16px; background: #f5f5f5;">
        <div style="width: 100%; max-width: 640px;">
          <copilot-chat-user-message
            [message]="message"
            inputClass="bg-blue-50 border border-blue-200 rounded-lg p-4"
            (editMessage)="editMessage($event)">
            <ng-template #messageRenderer let-content="content">
              <div class="prose dark:prose-invert bg-muted relative max-w-[80%] rounded-[18px] px-4 py-1.5 data-[multiline]:py-3 inline-block whitespace-pre-wrap text-blue-900 font-medium">
                {{ content }}
              </div>
            </ng-template>
          </copilot-chat-user-message>
        </div>
      </div>
    `,
  }),
};

export const CustomComponents: Story = {
  args: {
    message: simpleMessage,
    editMessage: () => console.log('Edit clicked!'),
    inputClass: 'bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4 shadow-sm',
  },
  render: () => ({
    props: {
      message: simpleMessage,
      editMessage: () => console.log('Edit clicked!'),
    },
    template: `
      <ng-template #messageRenderer let-content="content">
        <div class="font-mono text-purple-800 bg-white/50 rounded-lg px-3 py-2 inline-block">
          💬 {{ content }}
        </div>
      </ng-template>
      
      <div style="display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 16px; background: #f5f5f5;">
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
};

export const WithBranchNavigation: Story = {
  args: {
    message: {
      id: 'branch-message',
      content: 'This message has multiple branches. You can navigate between them using the branch controls.',
      role: 'user',
    },
    editMessage: () => console.log('Edit clicked!'),
    branchIndex: 2,
    numberOfBranches: 3,
    switchToBranch: ({ branchIndex }) =>
      console.log(`Switching to branch ${branchIndex + 1}`),
  },
};

export const WithManyBranches: Story = {
  args: {
    message: {
      id: 'many-branches-message',
      content: 'This is branch 5 of 10. Use the navigation arrows to explore different variations of this message.',
      role: 'user',
    },
    editMessage: () => console.log('Edit clicked!'),
    branchIndex: 4,
    numberOfBranches: 10,
    switchToBranch: ({ branchIndex }) =>
      alert(`Would switch to branch ${branchIndex + 1} of 10`),
  },
};