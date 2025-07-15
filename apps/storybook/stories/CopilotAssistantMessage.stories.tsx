import type { Meta, StoryObj } from "@storybook/react";
import {
  CopilotAssistantMessage,
  CopilotChatContextProvider,
  type CopilotAssistantMessageProps,
} from "@copilotkit/react";

// Comprehensive markdown test content
const markdownTestMessage = {
  id: "msg-markdown-test",
  content: `# Markdown Test Message

This message tests **all** possible markdown features:

## Headers
### H3 Header
#### H4 Header
##### H5 Header
###### H6 Header

## Text Formatting
- **Bold text**
- *Italic text*
- ***Bold and italic***
- ~~Strikethrough~~
- \`Inline code\`

## Lists
### Unordered List
- Item 1
- Item 2
  - Nested item 2.1
  - Nested item 2.2
- Item 3

### Ordered List
1. First item
2. Second item
   1. Nested numbered item
   2. Another nested item
3. Third item

## Code Blocks
\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return \`Welcome, \${name}\`;
}

// Usage
greet("World");
\`\`\`

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Generate sequence
for i in range(10):
    print(fibonacci(i))
\`\`\`

## Links and Images
- [External link](https://example.com)
- [Internal link](#section)
- ![Alt text](https://via.placeholder.com/150x100)

## Blockquotes
> This is a blockquote
> 
> It can span multiple lines
> 
> > And can be nested

## Tables
| Feature | Supported | Notes |
|---------|-----------|-------|
| Headers | ✅ | All levels |
| Lists | ✅ | Nested support |
| Code | ✅ | Syntax highlighting |
| Links | ✅ | External & internal |

## Horizontal Rule
---

## Miscellaneous
- [ ] Unchecked task
- [x] Checked task
- Emoji support: 🚀 ✨ 💡 🎉

### Math (if supported)
Inline math: $E = mc^2$

Block math:
$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

---
*End of markdown test content*`,
  timestamp: new Date(),
  role: "assistant" as const,
};

const meta = {
  title: "UI/CopilotAssistantMessage",
  component: CopilotAssistantMessage,
  decorators: [
    (Story) => (
      <CopilotChatContextProvider>
        <Story />
      </CopilotChatContextProvider>
    ),
  ],
  parameters: {
    layout: "centered",
  },
  args: {
    message: markdownTestMessage,
  },
} satisfies Meta<typeof CopilotAssistantMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
