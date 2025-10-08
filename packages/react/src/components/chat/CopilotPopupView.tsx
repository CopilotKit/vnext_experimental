import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import CopilotChatView, { CopilotChatViewProps } from "./CopilotChatView";
import CopilotChatToggleButton from "./CopilotChatToggleButton";
import { CopilotModalHeader } from "./CopilotModalHeader";
import { cn } from "@/lib/utils";
import { renderSlot, SlotValue } from "@/lib/slots";
import {
  CopilotChatDefaultLabels,
  useCopilotChatConfiguration,
} from "@/providers/CopilotChatConfigurationProvider";

const DEFAULT_POPUP_WIDTH = 480;
const DEFAULT_POPUP_HEIGHT = 720;
const STYLE_CLONE_ATTRIBUTE = "data-copilot-popup-style";

export type CopilotPopupViewProps = CopilotChatViewProps & {
  header?: SlotValue<typeof CopilotModalHeader>;
  width?: number | string;
  height?: number | string;
  windowFeatures?: string;
};

const parseDimension = (value: number | string | undefined, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
};

const buildWindowFeatures = (
  width: number | string | undefined,
  height: number | string | undefined,
  extraFeatures?: string,
) => {
  const resolvedWidth = parseDimension(width, DEFAULT_POPUP_WIDTH);
  const resolvedHeight = parseDimension(height, DEFAULT_POPUP_HEIGHT);

  const features = [
    "popup=yes",
    "noopener=yes",
    "resizable=yes",
    "scrollbars=yes",
    "toolbar=no",
    "location=no",
    "menubar=no",
    "status=no",
    `width=${resolvedWidth}`,
    `height=${resolvedHeight}`,
  ];

  if (extraFeatures) {
    features.push(extraFeatures);
  }

  return {
    width: resolvedWidth,
    height: resolvedHeight,
    featureString: features.join(","),
  };
};

const copyDocumentStyles = (source: Document, target: Document) => {
  target.documentElement.className = source.documentElement.className;

  const dataTheme = source.documentElement.getAttribute("data-theme");
  if (dataTheme) {
    target.documentElement.setAttribute("data-theme", dataTheme);
  } else {
    target.documentElement.removeAttribute("data-theme");
  }

  target
    .querySelectorAll(`[${STYLE_CLONE_ATTRIBUTE}]`)
    .forEach((node) => node.parentNode?.removeChild(node));

  const styles = source.querySelectorAll<HTMLElement>("head style, head link[rel='stylesheet']");
  styles.forEach((styleNode) => {
    const clone = styleNode.cloneNode(true) as HTMLElement;
    clone.setAttribute(STYLE_CLONE_ATTRIBUTE, "true");
    target.head.appendChild(clone);
  });
};

export function CopilotPopupView({
  header,
  width,
  height,
  windowFeatures,
  className,
  ...restProps
}: CopilotPopupViewProps) {
  const configuration = useCopilotChatConfiguration();
  const isPopupOpen = configuration?.isModalOpen ?? false;
  const setModalOpen = configuration?.setModalOpen;
  const labels = configuration?.labels ?? CopilotChatDefaultLabels;

  const popupWindowRef = useRef<Window | null>(null);
  const [popupContainer, setPopupContainer] = useState<HTMLDivElement | null>(null);

  const { featureString, width: resolvedWidth, height: resolvedHeight } = useMemo(
    () => buildWindowFeatures(width, height, windowFeatures),
    [width, height, windowFeatures],
  );

  useEffect(() => {
    if (!isPopupOpen) {
      if (popupWindowRef.current && !popupWindowRef.current.closed) {
        popupWindowRef.current.close();
      }
      popupWindowRef.current = null;
      setPopupContainer(null);
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    let popup = popupWindowRef.current;

    if (!popup || popup.closed) {
      popup = window.open("", "", featureString) ?? null;
      if (!popup) {
        setModalOpen?.(false);
        return;
      }

      popupWindowRef.current = popup;

      popup.document.title = labels.modalHeaderTitle;
      popup.document.body.style.margin = "0";
      popup.document.body.style.width = "100%";
      popup.document.body.style.height = "100vh";
      popup.document.body.style.display = "flex";

      const container = popup.document.createElement("div");
      container.setAttribute("data-copilot-popup-root", "true");
      container.style.flex = "1";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      popup.document.body.appendChild(container);

      setPopupContainer(container);

      copyDocumentStyles(window.document, popup.document);
    } else if (popupContainer == null) {
      const container = popup.document.querySelector<HTMLDivElement>("div[data-copilot-popup-root]");
      if (container) {
        setPopupContainer(container);
      }
    } else {
      popup.focus();
    }

    if (!popup) {
      return;
    }

    const handleUnload = () => {
      popupWindowRef.current = null;
      setPopupContainer(null);
      setModalOpen?.(false);
    };

    popup.addEventListener("beforeunload", handleUnload);

    return () => {
      popup.removeEventListener("beforeunload", handleUnload);
    };
  }, [featureString, isPopupOpen, labels.modalHeaderTitle, popupContainer, setModalOpen]);

  useEffect(() => {
    const popup = popupWindowRef.current;
    if (!isPopupOpen || !popup || popup.closed) {
      return;
    }

    popup.resizeTo(resolvedWidth, resolvedHeight);
  }, [isPopupOpen, resolvedHeight, resolvedWidth]);

  useEffect(() => {
    if (!isPopupOpen) {
      return;
    }

    const popupDoc = popupWindowRef.current?.document;
    if (!popupDoc) {
      return;
    }

    copyDocumentStyles(window.document, popupDoc);

    const headObserver = new MutationObserver(() => {
      if (popupDoc.defaultView?.closed) {
        headObserver.disconnect();
        return;
      }
      copyDocumentStyles(window.document, popupDoc);
    });

    headObserver.observe(window.document.head, { childList: true, subtree: true });

    const htmlObserver = new MutationObserver(() => {
      if (popupDoc.defaultView?.closed) {
        htmlObserver.disconnect();
        return;
      }
      popupDoc.documentElement.className = window.document.documentElement.className;
      const theme = window.document.documentElement.getAttribute("data-theme");
      if (theme) {
        popupDoc.documentElement.setAttribute("data-theme", theme);
      } else {
        popupDoc.documentElement.removeAttribute("data-theme");
      }
    });

    htmlObserver.observe(window.document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    return () => {
      headObserver.disconnect();
      htmlObserver.disconnect();
    };
  }, [isPopupOpen]);

  useEffect(() => {
    return () => {
      if (popupWindowRef.current && !popupWindowRef.current.closed) {
        popupWindowRef.current.close();
      }
      popupWindowRef.current = null;
      setPopupContainer(null);
    };
  }, []);

  const headerElement = useMemo(() => renderSlot(header, CopilotModalHeader, {}), [header]);

  const content = (
    <div
      data-copilot-popup
      className="flex h-full flex-col bg-background text-foreground"
      role="dialog"
      aria-label={labels.modalHeaderTitle}
    >
      {headerElement}
      <div className="flex-1 overflow-hidden" data-popup-chat>
        <CopilotChatView {...restProps} className={cn("h-full", className)} />
      </div>
    </div>
  );

  return (
    <>
      <CopilotChatToggleButton />
      {popupContainer && popupWindowRef.current && !popupWindowRef.current.closed
        ? createPortal(content, popupContainer)
        : null}
    </>
  );
}

CopilotPopupView.displayName = "CopilotPopupView";

export default CopilotPopupView;
