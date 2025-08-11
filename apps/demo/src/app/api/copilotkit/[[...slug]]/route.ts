import { CopilotRuntime, createCopilotEndpoint } from "@copilotkit/runtime";
import { SqliteAgentRunner } from "@copilotkit/runtime";
import { handle } from "hono/vercel";
import { OpenAIAgent } from "./openai";
import path from "path";

// Always use a file for SQLite database storage
const dbPath = path.join(process.cwd(), ".next", "copilotkit.db");

const runtime = new CopilotRuntime({
  agents: {
    default: new OpenAIAgent(),
  },
  runner: new SqliteAgentRunner({ dbPath }),
});

const app = createCopilotEndpoint({
  runtime,
  basePath: "/api/copilotkit",
});

export const GET = handle(app);
export const POST = handle(app);
