import React from "react";
import type { SlotComponentOrClassName } from "@/types/slots";

export function renderSlot<P extends { className?: string }>(
  slot: SlotComponentOrClassName<React.ComponentType<P>> | undefined,
  DefaultComponent: React.ComponentType<P>,
  props: Omit<P, "className">
): React.ReactElement {
  const [Component, className] =
    typeof slot === "string"
      ? [DefaultComponent, slot]
      : [slot ?? DefaultComponent, undefined];

  return <Component {...(props as P)} className={className} />;
}
