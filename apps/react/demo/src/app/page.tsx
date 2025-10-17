"use client";

import {
  CopilotKitProvider,
  useFrontendTool,
  defineToolCallRenderer,
  CopilotSidebar,
  CopilotChat,
} from "@copilotkitnext/react";
import type { ToolsMenuItem } from "@copilotkitnext/react";
import { z } from "zod";
import { useMemo, useState } from "react";

// Disable static optimization for this page
export const dynamic = "force-dynamic";

// Simulated users for demo
const DEMO_USERS = [
  { id: "user-alice", name: "Alice 👩", color: "bg-blue-100 border-blue-400" },
  { id: "user-bob", name: "Bob 👨", color: "bg-green-100 border-green-400" },
  { id: "user-charlie", name: "Charlie 🧑", color: "bg-purple-100 border-purple-400" },
  { id: "admin", name: "Admin 👑 (null scope)", color: "bg-red-100 border-red-400" },
];

export default function Home() {
  const [currentUser, setCurrentUser] = useState(DEMO_USERS[0]);
  // Define a wildcard renderer for any undefined tools
  const wildcardRenderer = defineToolCallRenderer({
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
    <CopilotKitProvider
      key={currentUser.id} // Force remount when user changes
      runtimeUrl="/api/copilotkit"
      renderToolCalls={[wildcardRenderer]}
      showDevConsole="auto"
      // Pass custom headers for resource scoping
      headers={{
        "x-user-id": currentUser.id === "admin" ? "" : currentUser.id,
        "x-is-admin": currentUser.id === "admin" ? "true" : "false",
      }}
    >
      <div style={{ height: "100vh", margin: 0, padding: 0, overflow: "hidden" }}>
        {/* User selector banner */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
          <div className="flex items-center gap-2 p-3">
            <span className="text-sm font-medium text-gray-700">Demo User:</span>
            <div className="flex gap-2">
              {DEMO_USERS.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setCurrentUser(user)}
                  className={`px-4 py-2 rounded-lg border-2 transition-all font-medium ${
                    currentUser.id === user.id ? user.color : "bg-white border-gray-300"
                  } hover:scale-105`}
                >
                  {user.name}
                </button>
              ))}
            </div>
            <div className="ml-auto text-xs text-gray-500 bg-white px-3 py-2 rounded border border-gray-300">
              <strong>Resource ID:</strong> {currentUser.id === "admin" ? "null (sees all)" : currentUser.id}
            </div>
          </div>
          <div className="px-3 pb-3 text-xs text-gray-600">
            <strong>💡 Try this:</strong> Create threads as Alice, then switch to Bob - you won&apos;t see Alice&apos;s
            threads! Admin can see all threads. This demonstrates resource scoping for multi-tenant apps.
          </div>
        </div>
        <div style={{ height: "calc(100vh - 100px)" }}>
          <Chat />
        </div>
      </div>
    </CopilotKitProvider>
  );
}

function Chat() {
  // useConfigureSuggestions({
  //   instructions: "Suggest helpful next actions",
  // });

  // useConfigureSuggestions({
  //   suggestions: [
  //     {
  //       title: "Action 1",
  //       message: "Do action 1",
  //     },
  //     {
  //       title: "Action 2",
  //       message: "Do action 2",
  //     },
  //   ],
  // });

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
  const toolsMenu = useMemo<(ToolsMenuItem | "-")[]>(
    () => [
      {
        label: "Say hi to CopilotKit",
        action: () => {
          const textarea = document.querySelector<HTMLTextAreaElement>("textarea[placeholder='Type a message...']");
          if (!textarea) {
            return;
          }

          const greeting = "Hello Copilot! 👋 Could you help me with something?";

          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            "value",
          )?.set;
          nativeInputValueSetter?.call(textarea, greeting);
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          textarea.focus();
        },
      },
      "-",
      {
        label: "Open CopilotKit Docs",
        action: () => {
          window.open("https://docs.copilotkit.ai", "_blank", "noopener,noreferrer");
        },
      },
    ],
    [],
  );

  // Demo: Two approaches for thread management
  // 1. Simple: Use CopilotThreadList component (recommended)
  // 2. Advanced: Use useThreadSwitch hook for custom UI

  // Approach 1: Using CopilotThreadList (easiest)
  // Grid layout with dedicated thread list sidebar
  return (
    <div className="grid grid-cols-[300px_1fr] h-full w-full">
      <CopilotSidebar showThreadListButton={true} showNewThreadButton={true} />
    </div>
  );

  // Approach 1b: Using CopilotSidebar with thread list button
  // Uncomment below to see the modal sidebar with thread list button:
  /*
  return (
    <CopilotChatConfigurationProvider>
      <CopilotSidebar
        showThreadListButton={true}
        defaultOpen={true}
        scrollBehavior="instant"
        inputProps={{
          toolsMenu,
        }}
      />
    </CopilotChatConfigurationProvider>
  );
  */

  // Approach 2: Using useThreadSwitch hook for custom UI
  // Uncomment below to see custom implementation:
  /*
  const { switchThread, currentThreadId } = useThreadSwitch();
  const { threads } = useThreads({ autoFetch: true });

  return (
    <div className="grid grid-cols-[300px_1fr] h-screen w-screen">
      <CopilotChatConfigurationProvider>
        <div className="flex flex-col gap-2 p-4 border-r border-gray-200 overflow-auto">
          <button
            onClick={() => switchThread(crypto.randomUUID())}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            + New Thread
          </button>
          {threads.map(({ firstMessage, threadId }) => (
            <div
              key={threadId}
              onClick={() => switchThread(threadId)}
              className={`p-3 rounded-lg cursor-pointer transition ${
                threadId === currentThreadId
                  ? "bg-blue-100 border-2 border-blue-500"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {firstMessage || "New conversation"}
            </div>
          ))}
        </div>
        <CopilotChat
          className="w-full h-full"
          inputProps={{ toolsMenu }}
        />
      </CopilotChatConfigurationProvider>
    </div>
  );
  */
}
