"use client";

import { HttpAgent } from "@ag-ui/client";
import { CopilotChat, CopilotKitProvider } from "@copilotkitnext/react";

// Disable static optimization for this page
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <CopilotKitProvider
      runtimeUrl="/api/copilotkit"
      agents={{
        default: new HttpAgent({
          url: "http://localhost:8000",
        }),
      }}
    >
      <div
        style={{ height: "100vh", margin: 0, padding: 0, overflow: "hidden" }}
      >
        <CopilotChat threadId="xyz" />
      </div>
    </CopilotKitProvider>
  );
}
