import React, { useMemo } from "react";

import { CopilotChat, CopilotChatProps } from "./CopilotChat";
import CopilotChatView, { CopilotChatViewProps } from "./CopilotChatView";
import { CopilotSidebarView, CopilotSidebarViewProps } from "./CopilotSidebarView";

export type CopilotSidebarProps = Omit<CopilotChatProps, "chatView"> & {
  header?: CopilotSidebarViewProps["header"];
  defaultOpen?: boolean;
  width?: number | string;
  showThreadListButton?: boolean;
  showNewThreadButton?: boolean;
};

export function CopilotSidebar({ header, defaultOpen, width, showThreadListButton, showNewThreadButton, ...chatProps }: CopilotSidebarProps) {
  const SidebarViewOverride = useMemo(() => {
    const Component: React.FC<CopilotChatViewProps> = (viewProps) => {
      const { header: viewHeader, width: viewWidth, showThreadListButton: viewShowThreadList, showNewThreadButton: viewShowNewThread, ...restProps } = viewProps as CopilotSidebarViewProps;

      return (
        <CopilotSidebarView
          {...(restProps as CopilotSidebarViewProps)}
          header={header ?? viewHeader}
          width={width ?? viewWidth}
          showThreadListButton={showThreadListButton ?? viewShowThreadList}
          showNewThreadButton={showNewThreadButton ?? viewShowNewThread}
        />
      );
    };

    return Object.assign(Component, CopilotChatView);
  }, [header, width, showThreadListButton, showNewThreadButton]);

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
