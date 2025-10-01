import React, { useEffect, useRef, useState } from "react";

import CopilotChatView, { CopilotChatViewProps } from "./CopilotChatView";
import { useCopilotChatConfiguration } from "@/providers/CopilotChatConfigurationProvider";
import CopilotChatToggleButton from "./CopilotChatToggleButton";
import { cn } from "@/lib/utils";
import { CopilotModalHeader } from "./CopilotModalHeader";
import { renderSlot, SlotValue } from "@/lib/slots";

const DEFAULT_SIDEBAR_WIDTH = 480;
const SIDEBAR_TRANSITION_MS = 260;

export type CopilotSidebarViewProps = CopilotChatViewProps & {
  header?: SlotValue<typeof CopilotModalHeader>;
  defaultOpen?: boolean;
};

function appendTransition(existing: string, addition: string) {
  if (!existing) {
    return addition;
  }

  const parts = existing.split(",").map((part) => part.trim());
  if (parts.includes(addition)) {
    return existing;
  }

  return `${existing}, ${addition}`;
}

function useBodyInlineOffset(isOpen: boolean, sidebarWidth: number) {
  const inlineMarginRef = useRef<string | null>(null);
  const inlineTransitionRef = useRef<string | null>(null);
  const computedMarginRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") {
      return () => {};
    }

    const body = document.body;
    inlineMarginRef.current = body.style.marginInlineEnd;
    inlineTransitionRef.current = body.style.transition;
    computedMarginRef.current = window.getComputedStyle(body).marginInlineEnd;

    const transitionAddition = `margin-inline-end ${SIDEBAR_TRANSITION_MS}ms ease`;
    body.style.transition = appendTransition(body.style.transition, transitionAddition);

    return () => {
      if (inlineTransitionRef.current !== null) {
        body.style.transition = inlineTransitionRef.current;
      } else {
        body.style.removeProperty("transition");
      }

      if (inlineMarginRef.current && inlineMarginRef.current.length > 0) {
        body.style.marginInlineEnd = inlineMarginRef.current;
      } else {
        body.style.removeProperty("margin-inline-end");
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const body = document.body;

    if (computedMarginRef.current === null) {
      computedMarginRef.current = window.getComputedStyle(body).marginInlineEnd;
    }

    const baseMargin = computedMarginRef.current ?? "0px";

    if (isOpen && sidebarWidth > 0) {
      if (baseMargin === "auto") {
        body.style.marginInlineEnd = `${Math.round(sidebarWidth)}px`;
      } else {
        body.style.marginInlineEnd = `calc(${baseMargin} + ${Math.round(sidebarWidth)}px)`;
      }
    } else if (inlineMarginRef.current && inlineMarginRef.current.length > 0) {
      body.style.marginInlineEnd = inlineMarginRef.current;
    } else {
      body.style.removeProperty("margin-inline-end");
    }
  }, [isOpen, sidebarWidth]);
}

export function CopilotSidebarView({ header, defaultOpen, ...props }: CopilotSidebarViewProps) {
  const configuration = useCopilotChatConfiguration();

  useEffect(() => {
    if (defaultOpen !== undefined) {
      configuration?.setModalOpen(defaultOpen);
    }
  }, [defaultOpen, configuration]);

  const isSidebarOpen = configuration?.isModalOpen ?? false;

  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const element = sidebarRef.current;
    if (!element) {
      return;
    }

    const updateWidth = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0) {
        setSidebarWidth(rect.width);
      }
    };

    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => updateWidth());
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useBodyInlineOffset(isSidebarOpen, sidebarWidth);

  const headerElement = renderSlot(header, CopilotModalHeader, {});

  return (
    <>
      <CopilotChatToggleButton />
      <aside
        ref={sidebarRef}
        data-copilot-sidebar
        className={cn(
          "fixed right-0 top-0 z-[1200] flex h-dvh max-h-screen w-full sm:w-[480px]",
          "border-l border-border bg-background text-foreground shadow-xl",
          "transition-transform duration-300 ease-out",
          isSidebarOpen ? "translate-x-0" : "translate-x-full pointer-events-none",
        )}
        aria-hidden={!isSidebarOpen}
        aria-label="Copilot chat sidebar"
        role="complementary"
      >
        <div className="flex h-full w-full flex-col overflow-hidden">
          {headerElement}
          <div className="flex-1 overflow-hidden px-4">
            <CopilotChatView {...props} />
          </div>
        </div>
      </aside>
    </>
  );
}

CopilotSidebarView.displayName = "CopilotSidebarView";

export default CopilotSidebarView;
