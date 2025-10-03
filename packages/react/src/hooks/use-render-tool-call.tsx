import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ToolCall, ToolMessage } from "@ag-ui/core";
import { ToolCallStatus } from "@copilotkitnext/core";
import { useCopilotKit } from "@/providers/CopilotKitProvider";
import { useCopilotChatConfiguration } from "@/providers/CopilotChatConfigurationProvider";
import { DEFAULT_AGENT_ID } from "@copilotkitnext/shared";
import { partialJSONParse } from "@copilotkitnext/shared";

export interface UseRenderToolCallProps {
  toolCall: ToolCall;
  toolMessage?: ToolMessage;
}

/**
 * Hook that returns a function to render tool calls based on the render functions
 * defined in CopilotKitProvider.
 *
 * @returns A function that takes a tool call and optional tool message and returns the rendered component
 */
export function useRenderToolCall() {
  const { copilotkit } = useCopilotKit();
  const config = useCopilotChatConfiguration();
  const agentId = config?.agentId ?? DEFAULT_AGENT_ID;
  const [executingToolCallIds, setExecutingToolCallIds] = useState<
    ReadonlySet<string>
  >(() => new Set());

  // Subscribe to render tool calls changes using useSyncExternalStore
  // This ensures we always have the latest value, even if subscriptions run in any order
  const renderToolCalls = useSyncExternalStore(
    (callback) => {
      return copilotkit.subscribe({
        onRenderToolCallsChanged: callback,
      });
    },
    () => copilotkit.renderToolCalls,
    () => copilotkit.renderToolCalls
  );

  useEffect(() => {
    const unsubscribe = copilotkit.subscribe({
      onToolExecutionStart: ({ toolCallId }) => {
        setExecutingToolCallIds((prev) => {
          if (prev.has(toolCallId)) return prev;
          const next = new Set(prev);
          next.add(toolCallId);
          return next;
        });
      },
      onToolExecutionEnd: ({ toolCallId }) => {
        setExecutingToolCallIds((prev) => {
          if (!prev.has(toolCallId)) return prev;
          const next = new Set(prev);
          next.delete(toolCallId);
          return next;
        });
      },
    });
    return () => unsubscribe();
  }, [copilotkit]);

  const renderToolCall = useCallback(
    ({
      toolCall,
      toolMessage,
    }: UseRenderToolCallProps): React.ReactElement | null => {
      // Find the render config for this tool call by name
      // For rendering, we show all tool calls regardless of agentId
      // The agentId scoping only affects handler execution (in core)
      // Priority order:
      // 1. Exact match by name (prefer agent-specific if multiple exist)
      // 2. Wildcard (*) renderer
      const exactMatches = renderToolCalls.filter(
        (rc) => rc.name === toolCall.function.name
      );

      // If multiple renderers with same name exist, prefer the one matching our agentId
      const renderConfig =
        exactMatches.find((rc) => rc.agentId === agentId) ||
        exactMatches.find((rc) => !rc.agentId) ||
        exactMatches[0] ||
        renderToolCalls.find((rc) => rc.name === "*");

      if (!renderConfig) {
        return null;
      }

      const RenderComponent = renderConfig.render;

      // Parse the arguments if they're a string
      const args = partialJSONParse(toolCall.function.arguments);

      // Create props based on status with proper typing
      const toolName = toolCall.function.name;

      if (toolMessage) {
        // Complete status with result
        return (
          <RenderComponent
            key={toolCall.id}
            name={toolName}
            args={args}
            status={ToolCallStatus.Complete}
            result={toolMessage.content}
          />
        );
      } else if (executingToolCallIds.has(toolCall.id)) {
        // Tool is currently executing
        return (
          <RenderComponent
            key={toolCall.id}
            name={toolName}
            // args should be complete when executing; but pass whatever we have
            args={args}
            status={ToolCallStatus.Executing}
            result={undefined}
          />
        );
      } else {
        // In progress status - tool call exists but hasn't completed yet
        // This remains true even after agent stops running, until we get a result
        return (
          <RenderComponent
            key={toolCall.id}
            name={toolName}
            args={args}
            status={ToolCallStatus.InProgress}
            result={undefined}
          />
        );
      }
    },
    [renderToolCalls, executingToolCallIds, agentId]
  );

  return renderToolCall;
}
