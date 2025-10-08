import React, { useEffect, useMemo, useRef, useState } from "react";
import CopilotChatView, { CopilotChatViewProps } from "./CopilotChatView";
import CopilotChatToggleButton from "./CopilotChatToggleButton";
import { CopilotModalHeader } from "./CopilotModalHeader";
import { cn } from "@/lib/utils";
import { renderSlot, SlotValue } from "@/lib/slots";
import {
  CopilotChatDefaultLabels,
  useCopilotChatConfiguration,
} from "@/providers/CopilotChatConfigurationProvider";

const DEFAULT_POPUP_WIDTH = 420;
const DEFAULT_POPUP_HEIGHT = 560;

export type CopilotPopupViewProps = CopilotChatViewProps & {
  header?: SlotValue<typeof CopilotModalHeader>;
  width?: number | string;
  height?: number | string;
  clickOutsideToClose?: boolean;
};

const dimensionToCss = (value: number | string | undefined, fallback: number): string => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}px`;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return `${fallback}px`;
};

export function CopilotPopupView({
  header,
  width,
  height,
  clickOutsideToClose,
  className,
  ...restProps
}: CopilotPopupViewProps) {
  const configuration = useCopilotChatConfiguration();
  const isPopupOpen = configuration?.isModalOpen ?? false;
  const setModalOpen = configuration?.setModalOpen;
  const labels = configuration?.labels ?? CopilotChatDefaultLabels;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendered, setIsRendered] = useState(isPopupOpen);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (isPopupOpen) {
      setIsRendered(true);
      setIsAnimatingOut(false);
      return;
    }

    if (!isRendered) {
      return;
    }

    setIsAnimatingOut(true);
    const timeout = setTimeout(() => {
      setIsRendered(false);
      setIsAnimatingOut(false);
    }, 200);

    return () => clearTimeout(timeout);
  }, [isPopupOpen, isRendered]);

  useEffect(() => {
    if (!isPopupOpen) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setModalOpen?.(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPopupOpen, setModalOpen]);

  useEffect(() => {
    if (!isPopupOpen) {
      return;
    }

    const focusTimer = setTimeout(() => {
      containerRef.current?.focus({ preventScroll: true });
    }, 200);

    return () => clearTimeout(focusTimer);
  }, [isPopupOpen]);

  useEffect(() => {
    if (!isPopupOpen || !clickOutsideToClose) {
      return;
    }

    if (typeof document === "undefined") {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      const container = containerRef.current;
      if (container?.contains(target)) {
        return;
      }

      const toggleButton = document.querySelector("[data-slot='chat-toggle-button']");
      if (toggleButton && toggleButton.contains(target)) {
        return;
      }

      setModalOpen?.(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isPopupOpen, clickOutsideToClose, setModalOpen]);

  const headerElement = useMemo(() => renderSlot(header, CopilotModalHeader, {}), [header]);

  const resolvedWidth = dimensionToCss(width, DEFAULT_POPUP_WIDTH);
  const resolvedHeight = dimensionToCss(height, DEFAULT_POPUP_HEIGHT);

  const popupContent = isRendered ? (
    <div className="fixed bottom-24 right-6 z-[1200] flex max-w-full flex-col items-end gap-4">
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-label={labels.modalHeaderTitle}
        data-copilot-popup
        className={cn(
          "relative flex max-w-lg flex-col overflow-hidden rounded-2xl border border-border",
          "bg-background text-foreground shadow-xl ring-1 ring-border/40",
          "focus:outline-none transition-all duration-200 ease-out",
          isPopupOpen && !isAnimatingOut
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-5 scale-[0.95] opacity-0",
        )}
        style={{
          width: resolvedWidth,
          maxWidth: "calc(100vw - 3rem)",
          height: resolvedHeight,
          maxHeight: "calc(100dvh - 7.5rem)",
          transformOrigin: "bottom right",
        }}
      >
        {headerElement}
        <div className="flex-1 overflow-hidden px-4" data-popup-chat>
          <CopilotChatView {...restProps} className={cn("h-full", className)} />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <CopilotChatToggleButton />
      {popupContent}
    </>
  );
}

CopilotPopupView.displayName = "CopilotPopupView";

export default CopilotPopupView;
