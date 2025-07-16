import type { Meta, StoryObj } from "@storybook/react";
import {
  CopilotAssistantMessage,
  CopilotChatContextProvider,
  type CopilotAssistantMessageProps,
} from "@copilotkit/react";

// Comprehensive markdown test content
const markdownTestMessage = {
  id: "test-message",
  content: `# Markdown Test Message

This message tests various markdown features including **bold**, *italic*, and \`inline code\`.

## Code Blocks with Copy Buttons

Here are some code examples to test the copy functionality:

### JavaScript/TypeScript
\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return \`Welcome, \${name}\`;
}

// Usage
greet("World");
\`\`\`

### Python
\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Generate sequence
for i in range(10):
    print(fibonacci(i))
\`\`\`

### SQL
\`\`\`sql
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2023-01-01'
GROUP BY u.id, u.name
ORDER BY order_count DESC;
\`\`\`

### JSON
\`\`\`json
{
  "name": "CopilotKit",
  "version": "2.0.0",
  "dependencies": {
    "react": "^18.0.0",
    "react-markdown": "^10.1.0"
  }
}
\`\`\`

### Shell/Bash
\`\`\`bash
#!/bin/bash
echo "Building project..."
npm install
npm run build
echo "Build complete!"
\`\`\`

## Inline Code Testing
Here's some \`inline code\` that should not have a copy button. You can also have \`npm install\` or \`const variable = "value"\` inline.

## Links and Images
- [External link](https://example.com)
- [Internal link](#section)
- ![Alt text](https://picsum.photos/150/100)

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
| Copy Button | ✅ | On code blocks only |

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
  args: {
    message: markdownTestMessage,
  },
} satisfies Meta<typeof CopilotAssistantMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// Message with code blocks and inline literals
const codeBlocksTestMessage = {
  id: "msg-code-blocks-test",
  content:
    "# Code Blocks and Inline Literals Test\n\n" +
    "This message demonstrates code syntax highlighting with various languages and inline code usage. " +
    "When you want to reference a variable like `userName` or a function like `getData()`, you can use inline code blocks.\n\n" +
    "## JavaScript Example\n" +
    "Here's how you might handle user authentication in JavaScript, `so` that you can verify credentials:\n\n" +
    "```javascript\n" +
    "const authenticateUser = async (email, password) => {\n" +
    "  try {\n" +
    "    const response = await fetch('/api/auth', {\n" +
    "      method: 'POST',\n" +
    "      headers: { 'Content-Type': 'application/json' },\n" +
    "      body: JSON.stringify({ email, password })\n" +
    "    });\n" +
    "    \n" +
    "    if (!response.ok) {\n" +
    "      throw new Error('Authentication failed');\n" +
    "    }\n" +
    "    \n" +
    "    return await response.json();\n" +
    "  } catch (error) {\n" +
    "    console.error('Error:', error);\n" +
    "    return null;\n" +
    "  }\n" +
    "};\n" +
    "```\n\n" +
    "## Python Data Processing\n" +
    "Python is great for data manipulation, `so` here's an example with pandas:\n\n" +
    "```python\n" +
    "import pandas as pd\n" +
    "import numpy as np\n\n" +
    "def process_user_data(csv_file):\n" +
    "    # Read the data\n" +
    "    df = pd.read_csv(csv_file)\n" +
    "    \n" +
    "    # Clean the data\n" +
    "    df['age'] = pd.to_numeric(df['age'], errors='coerce')\n" +
    "    df = df.dropna(subset=['age'])\n" +
    "    \n" +
    "    # Calculate statistics\n" +
    "    stats = {\n" +
    "        'mean_age': df['age'].mean(),\n" +
    "        'median_age': df['age'].median(),\n" +
    "        'total_users': len(df)\n" +
    "    }\n" +
    "    \n" +
    "    return stats\n\n" +
    "# Usage\n" +
    "result = process_user_data('users.csv')\n" +
    "print(f\"Average age: {result['mean_age']:.1f}\")\n" +
    "```\n\n" +
    "## SQL Database Query\n" +
    "When working with databases, you might use SQL queries like `SELECT * FROM users` or more complex ones:\n\n" +
    "```sql\n" +
    "SELECT \n" +
    "    u.id,\n" +
    "    u.username,\n" +
    "    u.email,\n" +
    "    COUNT(p.id) as post_count,\n" +
    "    MAX(p.created_at) as last_post_date\n" +
    "FROM users u\n" +
    "LEFT JOIN posts p ON u.id = p.user_id\n" +
    "WHERE u.active = true\n" +
    "    AND u.created_at >= '2023-01-01'\n" +
    "GROUP BY u.id, u.username, u.email\n" +
    "HAVING COUNT(p.id) > 0\n" +
    "ORDER BY post_count DESC, last_post_date DESC\n" +
    "LIMIT 50;\n" +
    "```\n\n" +
    "## Shell/Bash Commands\n" +
    "For deployment scripts, you might use bash commands. The `chmod` command changes permissions, `so` you can make files executable:\n\n" +
    "```bash\n" +
    "#!/bin/bash\n\n" +
    "# Deploy script\n" +
    'APP_NAME="my-app"\n' +
    "VERSION=$(git describe --tags --abbrev=0)\n\n" +
    'echo "Deploying $APP_NAME version $VERSION"\n\n' +
    "# Build the application\n" +
    "npm install\n" +
    "npm run build\n\n" +
    "# Create deployment package\n" +
    'tar -czf "${APP_NAME}-${VERSION}.tar.gz" dist/\n\n' +
    "# Upload to server\n" +
    'scp "${APP_NAME}-${VERSION}.tar.gz" user@server:/opt/deployments/\n\n' +
    "# Extract and restart\n" +
    "ssh user@server << EOF\n" +
    "    cd /opt/deployments\n" +
    "    tar -xzf ${APP_NAME}-${VERSION}.tar.gz\n" +
    "    sudo systemctl restart ${APP_NAME}\n" +
    '    echo "Deployment complete"\n' +
    "EOF\n" +
    "```\n\n" +
    "## TypeScript Interface\n" +
    "TypeScript helps with type safety, `so` you can define interfaces like:\n\n" +
    "```typescript\n" +
    "interface UserProfile {\n" +
    "  id: string;\n" +
    "  username: string;\n" +
    "  email: string;\n" +
    "  preferences: {\n" +
    "    theme: 'light' | 'dark';\n" +
    "    language: string;\n" +
    "    notifications: boolean;\n" +
    "  };\n" +
    "  lastLoginAt: Date | null;\n" +
    "}\n\n" +
    "class UserService {\n" +
    "  private users: Map<string, UserProfile> = new Map();\n\n" +
    "  async createUser(data: Omit<UserProfile, 'id' | 'lastLoginAt'>): Promise<UserProfile> {\n" +
    "    const user: UserProfile = {\n" +
    "      ...data,\n" +
    "      id: crypto.randomUUID(),\n" +
    "      lastLoginAt: null,\n" +
    "    };\n" +
    "    \n" +
    "    this.users.set(user.id, user);\n" +
    "    return user;\n" +
    "  }\n" +
    "  \n" +
    "  updateLastLogin(userId: string): void {\n" +
    "    const user = this.users.get(userId);\n" +
    "    if (user) {\n" +
    "      user.lastLoginAt = new Date();\n" +
    "    }\n" +
    "  }\n" +
    "}\n" +
    "```\n\n" +
    "## CSS Styling\n" +
    "For styling components, you can use CSS classes like `.container` or `#header`:\n\n" +
    "```css\n" +
    ".user-profile-card {\n" +
    "  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n" +
    "  border-radius: 12px;\n" +
    "  padding: 24px;\n" +
    "  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);\n" +
    "  transition: transform 0.3s ease;\n" +
    "}\n\n" +
    ".user-profile-card:hover {\n" +
    "  transform: translateY(-4px);\n" +
    "}\n\n" +
    ".user-avatar {\n" +
    "  width: 80px;\n" +
    "  height: 80px;\n" +
    "  border-radius: 50%;\n" +
    "  border: 3px solid rgba(255, 255, 255, 0.2);\n" +
    "  object-fit: cover;\n" +
    "}\n\n" +
    "@media (max-width: 768px) {\n" +
    "  .user-profile-card {\n" +
    "    padding: 16px;\n" +
    "    margin: 8px;\n" +
    "  }\n" +
    "}\n" +
    "```\n\n" +
    "All these examples show how inline code like `const`, `function`, and `class` can be mixed with code blocks to create comprehensive documentation.",
  timestamp: new Date(),
  role: "assistant" as const,
};

export const CodeBlocksWithLanguages: Story = {
  args: {
    message: codeBlocksTestMessage,
  },
};
