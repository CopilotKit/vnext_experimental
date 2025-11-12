import { DependencyList, useEffect, useMemo } from "react";
import { useCopilotKit } from "../providers/CopilotKitProvider";
import { ReactFrontendTool } from "../types/frontend-tool";
import { ReactToolCallRenderer } from "../types/react-tool-call-renderer";

export function useFrontendTool<T extends Record<string, unknown> = Record<string, unknown>>(
  tool: ReactFrontendTool<T>,
  deps?: DependencyList,
) {
  const { copilotkit } = useCopilotKit();
  const memoizationDeps: DependencyList = deps ?? [tool.render];
  const memoizedRender = useMemo(() => tool.render, memoizationDeps);
  const registrationKey = `${tool.agentId ?? ""}:${tool.name}`;

  useEffect(() => {
    const name = tool.name;

    // Always register/override the tool for this name on mount
    if (copilotkit.getTool({ toolName: name, agentId: tool.agentId })) {
      console.warn(
        `Tool '${name}' already exists for agent '${tool.agentId || "global"}'. Overriding with latest registration.`,
      );
      copilotkit.removeTool(name, tool.agentId);
    }
    copilotkit.addTool(tool);

    return () => {
      copilotkit.removeTool(name, tool.agentId);
      // we are intentionally not removing the render here so that the tools can still render in the chat history
    };
    // Depend only on stable keys to avoid re-register loops due to object identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrationKey, copilotkit]);

  useEffect(() => {
    if (!memoizedRender) {
      return;
    }

    const keyOf = (rc: ReactToolCallRenderer<any>) => `${rc.agentId ?? ""}:${rc.name}`;
    const currentRenderToolCalls = copilotkit.renderToolCalls as ReactToolCallRenderer<any>[];
    const existingEntry = currentRenderToolCalls.find((rc) => keyOf(rc) === registrationKey);

    if (existingEntry?.render === memoizedRender) {
      return;
    }

    const mergedMap = new Map<string, ReactToolCallRenderer<any>>();
    for (const rc of currentRenderToolCalls) {
      mergedMap.set(keyOf(rc), rc);
    }

    const newEntry = {
      name: tool.name,
      args: tool.parameters,
      agentId: tool.agentId,
      render: memoizedRender,
    } as ReactToolCallRenderer<any>;
    mergedMap.set(registrationKey, newEntry);

    copilotkit.setRenderToolCalls(Array.from(mergedMap.values()));
    // Intentionally depend only on stable identifiers plus render to avoid forcing developers to memoize schemas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copilotkit, registrationKey, memoizedRender]);
}
