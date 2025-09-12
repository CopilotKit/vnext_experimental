import React, { useCallback } from "react";
import { ToolCall, ToolMessage } from "@ag-ui/core";
import { ToolCallStatus } from "@copilotkitnext/core";
import { useCopilotKit } from "@/providers/CopilotKitProvider";
import { partialJSONParse } from "@copilotkitnext/shared";

export interface UseRenderToolCallProps {
  toolCall: ToolCall;
  toolMessage?: ToolMessage;
  isLoading: boolean;
}

/**
 * Hook that returns a function to render tool calls based on the render functions
 * defined in CopilotKitProvider.
 *
 * @returns A function that takes a tool call and optional tool message and returns the rendered component
 */
export function useRenderToolCall() {
  const { currentRenderToolCalls, executingToolCallIds } = useCopilotKit();

  const renderToolCall = useCallback(
    ({
      toolCall,
      toolMessage,
      isLoading,
    }: UseRenderToolCallProps): React.ReactElement | null => {
      // Find the render config for this tool call by name
      // Also check for wildcard (*) renders if no exact match
      const renderConfig =
        currentRenderToolCalls.find(
          (rc) => rc.name === toolCall.function.name
        ) || currentRenderToolCalls.find((rc) => rc.name === "*");

      if (!renderConfig) {
        return null;
      }

      const RenderComponent = renderConfig.render;

      // Parse the arguments if they're a string
      const args = partialJSONParse(toolCall.function.arguments);

      // Create props based on status with proper typing
      if (toolMessage) {
        // Complete status with result
        return (
          <RenderComponent
            key={toolCall.id}
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
            // args should be complete when executing; but pass whatever we have
            args={args}
            status={ToolCallStatus.Executing}
            result={undefined}
          />
        );
      } else if (isLoading) {
        // In progress status when loading
        return (
          <RenderComponent
            key={toolCall.id}
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
            args={args}
            status={ToolCallStatus.Complete}
            result=""
          />
        );
      }
    },
    [currentRenderToolCalls, executingToolCallIds]
  );

  return renderToolCall;
}
