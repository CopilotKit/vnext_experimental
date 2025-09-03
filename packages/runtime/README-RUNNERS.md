# Agent Runners

CopilotKit Runtime provides two agent runners for different use cases:

## InMemoryAgentRunner (Default)

The default runner that stores all data in memory. Perfect for development and applications that don't need persistence.

```typescript
import { CopilotRuntime, InMemoryAgentRunner } from "@copilotkitnext/runtime";

// Default - uses InMemoryAgentRunner automatically
const runtime = new CopilotRuntime({
  agents: myAgents,
});

// Or explicitly
const runtime = new CopilotRuntime({
  agents: myAgents,
  runner: new InMemoryAgentRunner(),
});
```

**Features:**

- No external dependencies
- Fast performance
- Data is lost when process restarts
- Perfect for development and stateless applications

## SqliteAgentRunner

Provides persistent storage using SQLite. Ideal for applications that need to preserve conversation history across restarts.

```typescript
import { CopilotRuntime, SqliteAgentRunner } from "@copilotkitnext/runtime";

const runtime = new CopilotRuntime({
  agents: myAgents,
  runner: new SqliteAgentRunner("./data/copilot.db"),
});

// Or use in-memory SQLite (data persists during runtime only)
const runtime = new CopilotRuntime({
  agents: myAgents,
  runner: new SqliteAgentRunner(":memory:"),
});
```

**Features:**

- Persistent storage across restarts
- Maintains conversation history
- Parent-child run relationships
- Event compaction for historic runs

**Requirements:**

- Requires `better-sqlite3` to be installed:
  ```bash
  npm install better-sqlite3
  ```

## Choosing the Right Runner

- **Use InMemoryAgentRunner when:**
  - Building prototypes or demos
  - Running in serverless environments
  - You don't need conversation history
  - You want zero external dependencies

- **Use SqliteAgentRunner when:**
  - You need persistent conversation history
  - Building production applications
  - You want to analyze historic conversations
  - Running on a traditional server

Both runners implement the same `AgentRunner` interface, so you can switch between them without changing your application code.
