import React, { useMemo } from "react";

import { CopilotChat, CopilotChatProps } from "./CopilotChat";
import CopilotChatView, { CopilotChatViewProps } from "./CopilotChatView";
import { CopilotSidebarView, CopilotSidebarViewProps } from "./CopilotSidebarView";

export type CopilotSidebarProps = Omit<CopilotChatProps, "chatView"> &
  Partial<Pick<CopilotSidebarViewProps, "header" | "defaultOpen">>;

export function CopilotSidebar({ header, defaultOpen, ...chatProps }: CopilotSidebarProps) {
  const SidebarViewOverride = useMemo(() => {
    const Component: React.FC<CopilotChatViewProps> = (viewProps) => {
      const sidebarViewProps = viewProps as CopilotSidebarViewProps;
      return (
        <CopilotSidebarView
          {...sidebarViewProps}
          header={header ?? sidebarViewProps.header}
          defaultOpen={defaultOpen ?? sidebarViewProps.defaultOpen}
        />
      );
    };

    return Object.assign(Component, CopilotChatView);
  }, [header, defaultOpen]);

  return <CopilotChat {...chatProps} chatView={SidebarViewOverride} />;
}

CopilotSidebar.displayName = "CopilotSidebar";

export default CopilotSidebar;
