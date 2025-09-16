import React, { createContext, useContext } from "react";
import { DEFAULT_AGENT_ID } from "@copilotkitnext/shared";

const CopilotAgentIdContext = createContext<string | undefined>(undefined);

export function CopilotAgentIdProvider({
  children,
  agentId,
}: {
  children: React.ReactNode;
  agentId?: string;
}) {
  return (
    <CopilotAgentIdContext.Provider value={agentId}>
      {children}
    </CopilotAgentIdContext.Provider>
  );
}

export function useCopilotAgentId(): string {
  const agentId = useContext(CopilotAgentIdContext);
  return agentId ?? DEFAULT_AGENT_ID;
}