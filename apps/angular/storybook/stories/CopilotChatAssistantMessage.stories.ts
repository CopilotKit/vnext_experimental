import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  CopilotChatAssistantMessageComponent,
  CopilotChatConfigurationService,
  provideCopilotChatConfiguration,
} from '@copilotkit/angular';
import { AssistantMessage } from '@ag-ui/client';

const sampleMessage: AssistantMessage = {
  id: 'msg-1',
  role: 'assistant',
  createdAt: new Date(),
  content: `Hello! I can help you with various tasks. Here's what I can do:

## Features

I support **bold text**, *italic text*, and ~~strikethrough~~.

### Code Blocks

Here's a TypeScript example:

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email?: string;
}

function greetUser(user: User): string {
  return \`Hello, ${user.name}!\`;
}

const user: User = {
  id: 1,
  name: "Alice"
};

console.log(greetUser(user));
\`\`\`

### Lists

- First item
- Second item
  - Nested item
  - Another nested item
- Third item

### Tables

| Feature | Supported | Notes |
|---------|-----------|-------|
| Markdown | ✅ | Full GFM support |
| Code Highlighting | ✅ | Multiple languages |
| Math | ✅ | LaTeX syntax |

### Math Equations

Inline math: $E = mc^2$

Display math:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

### Links

Check out [CopilotKit](https://copilotkit.ai) for more information.

That's a quick overview of what I can help you with!`
};

const partialMarkdownMessage: AssistantMessage = {
  id: 'msg-2',
  role: 'assistant',
  createdAt: new Date(),
  content: `Here's some incomplete markdown that should be auto-completed:

**Bold text that isn't closed

*Italic text that isn't closed

[Link without closing paren](https://example.com

\`\`\`javascript
// Code block that isn't closed
function hello() {
  console.log("Hello world");
}

And some text with an unclosed \`inline code

Nested emphasis: **bold with *italic inside that isn't closed**`
};

const codeOnlyMessage: AssistantMessage = {
  id: 'msg-3',
  role: 'assistant',
  createdAt: new Date(),
  content: `Here are examples in different languages:

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Calculate the 10th Fibonacci number
result = fibonacci(10)
print(f"The 10th Fibonacci number is: {result}")
\`\`\`

\`\`\`javascript
// React component example
const Button = ({ onClick, children, disabled = false }) => {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className="btn btn-primary"
    >
      {children}
    </button>
  );
};

export default Button;
\`\`\`

\`\`\`css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }
}
\`\`\``
};

// Custom slot component for demonstration
@Component({
  selector: 'custom-markdown-renderer',
  template: `
    <div style="padding: 1rem; background: #f0f0f0; border-radius: 8px;">
      <h3>Custom Renderer</h3>
      <p>{{ content }}</p>
    </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
class CustomMarkdownRenderer {
  @Input() content = '';
}

const meta: Meta<CopilotChatAssistantMessageComponent> = {
  title: 'Components/CopilotChatAssistantMessage',
  component: CopilotChatAssistantMessageComponent,
  decorators: [
    moduleMetadata({
      imports: [
        CommonModule,
        CopilotChatAssistantMessageComponent,
        CustomMarkdownRenderer
      ],
      providers: [
        provideCopilotChatConfiguration({
          labels: {
            assistantMessageToolbarCopyMessageLabel: 'Copy message',
            assistantMessageToolbarThumbsUpLabel: 'Good response',
            assistantMessageToolbarThumbsDownLabel: 'Bad response',
            assistantMessageToolbarReadAloudLabel: 'Read aloud',
            assistantMessageToolbarRegenerateLabel: 'Regenerate response',
            assistantMessageToolbarCopyCodeLabel: 'Copy',
            assistantMessageToolbarCopyCodeCopiedLabel: 'Copied!'
          }
        })
      ]
    })
  ],
  tags: ['autodocs'],
  argTypes: {
    message: {
      description: 'The assistant message to display',
      control: { type: 'object' }
    },
    toolbarVisible: {
      description: 'Whether to show the toolbar',
      control: { type: 'boolean' },
      defaultValue: true
    },
    additionalToolbarItems: {
      description: 'Additional toolbar items template',
      control: false
    }
  }
};

export default meta;
type Story = StoryObj<CopilotChatAssistantMessageComponent>;

export const Default: Story = {
  args: {
    message: sampleMessage,
    toolbarVisible: true
  }
};

export const WithEventHandlers: Story = {
  args: {
    message: sampleMessage,
    toolbarVisible: true
  },
  render: (args) => ({
    props: {
      ...args,
      onThumbsUp: (event: any) => {
        console.log('Thumbs up clicked:', event);
        alert('Thanks for the positive feedback!');
      },
      onThumbsDown: (event: any) => {
        console.log('Thumbs down clicked:', event);
        alert('Sorry to hear that. We\'ll try to improve!');
      },
      onReadAloud: (event: any) => {
        console.log('Read aloud clicked:', event);
        alert('Reading aloud: ' + event.message.content.substring(0, 50) + '...');
      },
      onRegenerate: (event: any) => {
        console.log('Regenerate clicked:', event);
        alert('Regenerating response...');
      }
    },
    template: `
      <copilot-chat-assistant-message
        [message]="message"
        [toolbarVisible]="toolbarVisible"
        (thumbsUp)="onThumbsUp($event)"
        (thumbsDown)="onThumbsDown($event)"
        (readAloud)="onReadAloud($event)"
        (regenerate)="onRegenerate($event)">
      </copilot-chat-assistant-message>
    `
  })
};

export const PartialMarkdown: Story = {
  args: {
    message: partialMarkdownMessage,
    toolbarVisible: true
  }
};

export const CodeExamples: Story = {
  args: {
    message: codeOnlyMessage,
    toolbarVisible: true
  }
};

export const WithoutToolbar: Story = {
  args: {
    message: sampleMessage,
    toolbarVisible: false
  }
};

export const CustomSlots: Story = {
  render: () => ({
    props: {
      message: sampleMessage,
      customContent: 'This is custom rendered content!'
    },
    template: `
      <copilot-chat-assistant-message [message]="message">
        <ng-template #markdownRenderer let-content="content">
          <custom-markdown-renderer [content]="customContent"></custom-markdown-renderer>
        </ng-template>
        
        <ng-template #copyButton let-onClick="onClick">
          <button 
            (click)="onClick()"
            style="padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Custom Copy Button
          </button>
        </ng-template>
      </copilot-chat-assistant-message>
    `
  })
};

export const AdditionalToolbarItems: Story = {
  render: () => ({
    props: {
      message: sampleMessage
    },
    template: `
      <copilot-chat-assistant-message 
        [message]="message"
        [additionalToolbarItems]="additionalItems">
        <ng-template #additionalItems>
          <button style="padding: 0.25rem 0.5rem; margin-left: 0.5rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Custom Action
          </button>
        </ng-template>
      </copilot-chat-assistant-message>
    `
  })
};

export const SimpleMessage: Story = {
  args: {
    message: {
      id: 'simple-1',
      role: 'assistant',
      createdAt: new Date(),
      content: 'This is a simple text response without any formatting.'
    } as AssistantMessage,
    toolbarVisible: true
  }
};

export const EmptyMessage: Story = {
  args: {
    message: {
      id: 'empty-1',
      role: 'assistant',
      createdAt: new Date(),
      content: ''
    } as AssistantMessage,
    toolbarVisible: true
  }
};