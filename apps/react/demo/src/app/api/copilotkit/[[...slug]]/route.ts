import { CopilotRuntime, createCopilotEndpoint, InMemoryAgentRunner } from "@copilotkitnext/runtime";
import { handle } from "hono/vercel";
import { BasicAgent } from "@copilotkitnext/agent";

// Determine which model to use based on available API keys
const getModelConfig = () => {
  if (process.env.OPENAI_API_KEY?.trim()) {
    return "openai/gpt-4o-mini";
  } else if (process.env.ANTHROPIC_API_KEY?.trim()) {
    return "anthropic/claude-sonnet-4.5";
  } else if (process.env.GOOGLE_API_KEY?.trim()) {
    return "google/gemini-2.5-pro";
  }
  // Default to OpenAI (will fail at runtime if no key is set)
  return "openai/gpt-4o-mini";
};

const agent = new BasicAgent({
  model: getModelConfig(),
  prompt: "You are a helpful AI assistant.",
  temperature: 0.7,
});

const runtime = new CopilotRuntime({
  agents: {
    default: agent,
  },
  runner: new InMemoryAgentRunner(),
  // Resource scoping: Control which threads each user can access
  // Security note: In production, authenticate via session cookies, JWTs, etc.
  // The client declares which user they are (x-user-id header), but YOU must
  // validate this against your auth system. This demo simulates that validation.
  resolveThreadsScope: async ({ request }) => {
    const userId = request.headers.get("x-user-id");
    const isAdmin = request.headers.get("x-is-admin") === "true";

    // Admin bypass: sees all threads across all users
    if (isAdmin) {
      return null; // null = no filtering (admin access)
    }

    // Regular user: only sees their own threads
    // In production: const userId = await authenticateUser(request);
    return {
      resourceId: userId || "anonymous",
    };
  },
  // Suppress warnings for demo purposes
  suppressResourceIdWarning: true,
});

const app = createCopilotEndpoint({
  runtime,
  basePath: "/api/copilotkit",
});

export const GET = handle(app);
export const POST = handle(app);
export const DELETE = handle(app);
