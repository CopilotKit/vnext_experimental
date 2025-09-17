import React, { useCallback, useEffect, useState } from "react";
import { ToolCall, ToolMessage } from "@ag-ui/core";
import { ToolCallStatus } from "@copilotkitnext/core";
import { useCopilotKit } from "@/providers/CopilotKitProvider";
import { useCopilotChatConfiguration } from "@/providers/CopilotChatConfigurationProvider";
import { partialJSONParse } from "@copilotkitnext/shared";

export interface UseRenderToolCallProps {
  toolCall: ToolCall;
  toolMessage?: ToolMessage;
  isRunning: boolean;
}

/**
 * Hook that returns a function to render tool calls based on the render functions
 * defined in CopilotKitProvider.
 *
 * @returns A function that takes a tool call and optional tool message and returns the rendered component
 */
export function useRenderToolCall() {
  const { currentRenderToolCalls, copilotkit } = useCopilotKit();
  const { agentId } = useCopilotChatConfiguration();
  const [executingToolCallIds, setExecutingToolCallIds] = useState<
    ReadonlySet<string>
  >(() => new Set());

  useEffect(() => {
    const unsubscribe = copilotkit.subscribe({
      onToolExecutionStart: ({ toolCallId }: { toolCallId: string }) => {
        setExecutingToolCallIds((prev) => {
          if (prev.has(toolCallId)) return prev;
          const next = new Set(prev);
          next.add(toolCallId);
          return next;
        });
      },
      onToolExecutionEnd: ({ toolCallId }: { toolCallId: string }) => {
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
      isRunning,
    }: UseRenderToolCallProps): React.ReactElement | null => {
      // Find the render config for this tool call by name
      // For rendering, we show all tool calls regardless of agentId
      // The agentId scoping only affects handler execution (in core)
      // Priority order:
      // 1. Exact match by name (prefer agent-specific if multiple exist)
      // 2. Wildcard (*) renderer
      const exactMatches = currentRenderToolCalls.filter(
        (rc) => rc.name === toolCall.function.name
      );

      // If multiple renderers with same name exist, prefer the one matching our agentId
      const renderConfig =
        exactMatches.find((rc) => rc.agentId === agentId) ||
        exactMatches.find((rc) => !rc.agentId) ||
        exactMatches[0] ||
        currentRenderToolCalls.find((rc) => rc.name === "*");

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
      } else if (isRunning) {
        // In progress status when loading
        return (
          <RenderComponent
            key={toolCall.id}
            name={toolName}
            args={args}
            status={ToolCallStatus.InProgress}
            result={undefined}
          />
        );
      } else {
        // Complete status without result (empty result)
        return (
          <RenderComponent
            key={toolCall.id}
            name={toolName}
            args={args}
            status={ToolCallStatus.Complete}
            result=""
          />
        );
      }
    },
    [currentRenderToolCalls, executingToolCallIds, agentId]
  );

  return renderToolCall;
}
