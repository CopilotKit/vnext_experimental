import React, { useMemo } from "react";

import { CopilotChat, CopilotChatProps } from "./CopilotChat";
import CopilotChatView, { CopilotChatViewProps } from "./CopilotChatView";
import { CopilotSidebarView, CopilotSidebarViewProps } from "./CopilotSidebarView";

export type CopilotSidebarProps = Omit<CopilotChatProps, "chatView"> & {
  header?: CopilotSidebarViewProps["header"];
  defaultOpen?: boolean;
};

export function CopilotSidebar({ header, defaultOpen, ...chatProps }: CopilotSidebarProps) {
  const SidebarViewOverride = useMemo(() => {
    const Component: React.FC<CopilotChatViewProps> = (viewProps) => {
      const { header: viewHeader, ...restProps } = viewProps as CopilotSidebarViewProps;

      return (
        <CopilotSidebarView
          {...(restProps as CopilotSidebarViewProps)}
          header={header ?? viewHeader}
        />
      );
    };

    return Object.assign(Component, CopilotChatView);
  }, [header]);

  return (
    <CopilotChat
      {...chatProps}
      chatView={SidebarViewOverride}
      isModalDefaultOpen={defaultOpen}
    />
  );
}

CopilotSidebar.displayName = "CopilotSidebar";

export default CopilotSidebar;
