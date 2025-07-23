import React from "react";

export type SlotComponentOrClassName<ComponentType> = ComponentType | string;

export type SlotValue<P> = React.ComponentType<P> | string | Partial<P>;

export type Slots<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  S extends Record<string, SlotComponentOrClassName<any>>,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  P = {},
> = {
  [Name in keyof S]?: SlotComponentOrClassName<S[Name]>;
} & P & {
    children?: (
      props: { [K in keyof S]: React.ReactElement } & P
    ) => React.ReactNode;
  };

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
