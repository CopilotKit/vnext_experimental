import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { CopilotRuntime, createCopilotEndpoint, InMemoryAgentRunner } from "@copilotkitnext/runtime";
import { OpenAIAgent, SlowToolCallStreamingAgent } from "@copilotkitnext/demo-agents";
import { HttpAgent, HttpAgentConfig, RunAgentInput } from "@ag-ui/client";
import { LangGraphHttpAgent } from "@ag-ui/langgraph";



class SplendidAgent extends LangGraphHttpAgent {
  constructor(config: HttpAgentConfig) {
      super(config);
      console.log('🚀 SplendidAgent initialized with config:', {
          url: config.url,
          headers: config.headers ? Object.keys(config.headers) : 'none',
          debug: config.debug
      });
  }

  requestInit(input: RunAgentInput) {
      const request = super.requestInit(input);

      console.log('📤 Outgoing Request Details:');
      console.log('   URL:', this.url);
      console.log('   Method:', request.method || 'POST');
      console.log('   Headers:', JSON.stringify(request.headers, null, 2));
      // console.log('   Body:', request.body ? JSON.stringify(JSON.parse(request.body), null, 2) : 'none');

      return request;
  }

  run(input: RunAgentInput) {

    const request = super.requestInit(input);
    console.log('🚀 SplendidAgent running with request:', request);
      return super.run({
          ...input,
          forwardedProps: {
              ...input.forwardedProps,
              stream_subgraphs: true,
              streamSubgraphs: true,
          }
      });
  }
}


const runtime = new CopilotRuntime({
  agents: {
    // @ts-ignore
    openai:  new SplendidAgent({
      url: 'localhost:8000' + "/agent/agentic_chat",

      headers: {'x-chz': "whiz"},
      debug: true,
    }),
  },
  runner: new InMemoryAgentRunner(),
});

// Create a main app with CORS enabled
const app = new Hono();

// Enable CORS for local dev (Angular demo at http://localhost:4200)
app.use(
  "*",
  cors({
    origin: "http://localhost:4200",
    allowMethods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Max-wuzhear"],
    exposeHeaders: ["Content-Type"],
    credentials: true,
    maxAge: 86400,
  }),
);

// Create the CopilotKit endpoint
const copilotApp = createCopilotEndpoint({
  runtime,
  basePath: "/api/copilotkit",
});

// Mount the CopilotKit app
app.route("/", copilotApp);

const port = Number(process.env.PORT || 3001);
serve({ fetch: app.fetch, port });
console.log(`CopilotKit runtime listening at http://localhost:${port}/api/copilotkit`);
