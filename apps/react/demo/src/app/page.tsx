"use client";

import { HttpAgent } from "@ag-ui/client";
import {
  CopilotChat,
  CopilotKitProvider,
  useCopilotKit,
  useFrontendTool,
} from "@copilotkitnext/react";
import { z } from "zod";

// Disable static optimization for this page
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <CopilotKitProvider runtimeUrl="/api/copilotkit">
      <div
        style={{ height: "100vh", margin: 0, padding: 0, overflow: "hidden" }}
      >
        <Chat />
      </div>
    </CopilotKitProvider>
  );
}

function Chat() {
  const { copilotkit } = useCopilotKit();

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
