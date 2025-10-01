"use client";

import { HttpAgent } from "@ag-ui/client";
import {
  CopilotChat,
  CopilotKitProvider,
  useCopilotKit,
  useFrontendTool,
  defineToolCallRender,
} from "@copilotkitnext/react";
import { z } from "zod";

// Disable static optimization for this page
export const dynamic = "force-dynamic";

export default function Home() {
  // Define a wildcard renderer for any undefined tools
  const wildcardRenderer = defineToolCallRender({
    name: "*",
    // No args needed for wildcard - defaults to z.any()
    render: ({ name, args, status }) => (
      <div
        style={{
          padding: "12px",
          margin: "8px 0",
          backgroundColor: "#f0f0f0",
          borderRadius: "8px",
          border: "1px solid #ccc",
        }}
      >
        <strong>Unknown Tool: {name}</strong>
        <pre style={{ marginTop: "8px", fontSize: "12px" }}>
          Status: {status}
          {args && "\nArguments: " + JSON.stringify(args, null, 2)}
        </pre>
      </div>
    ),
  });

  return (
    <CopilotKitProvider runtimeUrl="/api/copilotkit" renderToolCalls={[wildcardRenderer]}>
      <div style={{ height: "100vh", margin: 0, padding: 0, overflow: "hidden" }}>
        <Chat />
      </div>
    </CopilotKitProvider>
  );
}

function Chat() {
  useFrontendTool({
    name: "sayHello",
    parameters: z.object({
      name: z.string(),
    }),
    handler: async ({ name }) => {
      alert(`Hello ${name}`);
      return `Hello ${name}`;
    },
  });
  return <CopilotChat threadId="xyz" />;
}
