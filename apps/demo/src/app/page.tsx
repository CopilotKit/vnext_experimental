"use client";

import { CopilotChat, CopilotKitProvider } from "@copilotkit/react";

// Disable static optimization for this page
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <CopilotKitProvider runtimeUrl="/api/copilotkit">
      <div
        style={{ height: "100vh", margin: 0, padding: 0, overflow: "hidden" }}
      >
        <CopilotChat threadId="1" />
      </div>
    </CopilotKitProvider>
  );
}
