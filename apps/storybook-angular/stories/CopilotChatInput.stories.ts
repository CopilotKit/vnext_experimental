import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { CommonModule } from '@angular/common';
import { fn } from '@storybook/test';
import { 
  CopilotChatInputComponent,
  provideCopilotChatConfiguration,
  type ToolsMenuItem 
} from '@copilotkit/angular';

const meta: Meta<CopilotChatInputComponent> = {
  title: 'UI/CopilotChatInput',
  component: CopilotChatInputComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [CommonModule, CopilotChatInputComponent],
      providers: [
        provideCopilotChatConfiguration({
          labels: {
            chatInputPlaceholder: 'Type a message...',
            chatInputToolbarToolsButtonLabel: 'Tools',
          }
        })
      ],
    }),
  ],
  render: (args) => ({
    props: {
      ...args,
      submitMessage: fn(),
      startTranscribe: fn(),
      cancelTranscribe: fn(),
      finishTranscribe: fn(),
      addFile: fn(),
      valueChange: fn(),
    },
    template: `
      <div style="position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: center; padding: 16px;">
        <div style="width: 100%; max-width: 640px;">
          <copilot-chat-input
            [mode]="mode"
            [inputClass]="inputClass"
            [toolsMenu]="toolsMenu"
            [value]="value"
            [autoFocus]="autoFocus"
            (submitMessage)="submitMessage($event)"
            (startTranscribe)="startTranscribe()"
            (cancelTranscribe)="cancelTranscribe()"
            (finishTranscribe)="finishTranscribe()"
            (addFile)="addFile()"
            (valueChange)="valueChange($event)"
          ></copilot-chat-input>
        </div>
      </div>
    `,
  }),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
The CopilotChatInput component provides a chat input interface for Angular applications.

## Features
- Text input with auto-resizing textarea
- Voice recording mode
- Tools dropdown menu
- File attachment support
- Dark/light theme support
- Customizable styling

## Usage

\`\`\`typescript
import { CopilotChatInputComponent } from '@copilotkit/angular';
import { provideCopilotChatConfiguration } from '@copilotkit/angular';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CopilotChatInputComponent],
  providers: [
    provideCopilotChatConfiguration({
      labels: {
        chatInputPlaceholder: 'Type a message...',
      }
    })
  ],
  template: \`
    <copilot-chat-input
      (submitMessage)="onSubmitMessage($event)"
    ></copilot-chat-input>
  \`
})
export class ChatComponent {
  onSubmitMessage(message: string): void {
    console.log('Message:', message);
  }
}
\`\`\`
        `
      }
    }
  },
  argTypes: {
    mode: {
      control: { type: 'radio' },
      options: ['input', 'transcribe'],
      description: 'The input mode for the component',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'input' },
        category: 'Behavior'
      }
    },
    inputClass: {
      control: { type: 'text' },
      description: 'Custom CSS class for styling',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '' },
        category: 'Appearance'
      }
    },
    value: {
      control: { type: 'text' },
      description: 'Input value',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '' },
        category: 'Data'
      }
    },
    autoFocus: {
      control: { type: 'boolean' },
      description: 'Auto-focus the input on mount',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
        category: 'Behavior'
      }
    }
  },
  args: {
    mode: 'input',
    inputClass: '',
    value: '',
    autoFocus: true,
  }
};

export default meta;
type Story = StoryObj<CopilotChatInputComponent>;

export const Default: Story = {};

export const WithToolsMenu: Story = {
  name: 'With Tools Menu',
  args: {
    toolsMenu: [
      {
        label: 'Do X',
        action: () => console.log('Do X clicked')
      },
      {
        label: 'Do Y',
        action: () => console.log('Do Y clicked')
      },
      '-',
      {
        label: 'Advanced',
        items: [
          {
            label: 'Do Advanced X',
            action: () => console.log('Do Advanced X clicked')
          },
          '-',
          {
            label: 'Do Advanced Y',
            action: () => console.log('Do Advanced Y clicked')
          }
        ]
      }
    ] as (ToolsMenuItem | '-')[]
  }
};

export const TranscribeMode: Story = {
  name: 'Voice Recording Mode',
  args: {
    mode: 'transcribe',
    autoFocus: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the audio recording interface with animated waveform visualization.'
      }
    }
  }
};

export const CustomStyling: Story = {
  name: 'Custom Styling',
  args: {
    inputClass: 'custom-chat-input',
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates custom CSS styling. Add your custom styles to the global stylesheet.'
      }
    }
  }
};

export const PrefilledText: Story = {
  name: 'Prefilled Text',
  args: {
    value: 'Hello, this is a prefilled message!',
  },
  parameters: {
    docs: {
      description: {
        story: 'Input with initial text value set.'
      }
    }
  }
};

export const ExpandedTextarea: Story = {
  name: 'Expanded Textarea',
  args: {
    value: 'This is a longer message that will cause the textarea to expand.\n\nIt has multiple lines to demonstrate the auto-resize functionality.\n\nThe textarea will grow up to the maxRows limit.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates the auto-expanding textarea with multiple lines of content.'
      }
    }
  }
};

export const Playground: Story = {
  name: 'Playground',
  args: {
    toolsMenu: [
      {
        label: 'Clear Chat',
        action: () => console.log('Clear chat clicked')
      },
      {
        label: 'Export',
        action: () => console.log('Export clicked')
      },
      '-',
      {
        label: 'Settings',
        items: [
          {
            label: 'Preferences',
            action: () => console.log('Preferences clicked')
          },
          {
            label: 'Account',
            action: () => console.log('Account clicked')
          },
        ]
      }
    ] as (ToolsMenuItem | '-')[],
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive playground - Use the controls panel to experiment with all component properties.'
      }
    }
  }
};