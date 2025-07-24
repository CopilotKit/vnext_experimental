import { WithSlots, OmitSlotProps } from "@/lib/slots";
import CopilotChatAssistantMessage from "./CopilotChatAssistantMessage";

export type CopilotChatMessagesProps = WithSlots<
  {
    assistantMessage: OmitSlotProps<
      typeof CopilotChatAssistantMessage,
      "message"
    >;
  },
  {
    messages?: any[];
  }
>;

export function CopilotChatMessages({
  messages = [],
  assistantMessage,
  children,
}: CopilotChatMessagesProps) {
  // Dummy implementation for now
  return <div>hello world</div>;
}

function Z() {
  // ✅ Now only subslots are accessible, onReadAloud is excluded
  return (
    <CopilotChatMessages
      assistantMessage={{
        copyButton: () => <button>copy</button>,
        onReadAloud: () => {}, // ❌ No longer accessible - callbacks excluded!
        // message: null
      }}
    />
  );
}

function ExampleUsages() {
  return (
    <>
      {/* ✅ All subslots are accessible */}
      <CopilotChatMessages
        assistantMessage={"bg-red-500"}
        // assistantMessage={{
        //   Container: ({ children }) => <div className="custom">{children}</div>,
        //   CopyButton: () => <button>copy</button>,
        //   ThumbsUpButton: "bg-blue-500", // string className
        //   // ✅ Non-callback props are still accessible
        //   additionalToolbarItems: <button>Custom</button>,
        // }}
      />

      {/* ❌ Callback properties are omitted */}
      {/*
      <CopilotChatMessages
        AssistantMessage={{
          onReadAloud: () => {},   // TypeScript error!
          onThumbsUp: () => {},    // TypeScript error!
          onThumbsDown: () => {},  // TypeScript error!
          onRegenerate: () => {},  // TypeScript error!
        }}
      />
      */}
    </>
  );
}
