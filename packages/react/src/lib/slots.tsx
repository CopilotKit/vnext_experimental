import React from "react";
import type { SlotConfig } from "@/types/slots";

export function renderSlot<P extends { className?: string }>(
  slotCfg: SlotConfig<React.ComponentType<P>> | undefined,
  DefaultComponent: React.ComponentType<P>,
  props: Omit<P, "className">
): React.ReactElement {
  // pick your component…
  const Component = slotCfg?.component ?? DefaultComponent;
  // …and only supply a className if the user passed one
  const className = slotCfg?.className;
  return <Component {...(props as P)} className={className} />;
}
