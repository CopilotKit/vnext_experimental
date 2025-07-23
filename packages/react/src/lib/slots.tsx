import React from "react";

/** Utility: Create a component type with specific props omitted */
export type OmitSlotProps<
  C extends React.ComponentType<any>,
  K extends keyof React.ComponentProps<C>,
> = React.ComponentType<Omit<React.ComponentProps<C>, K>>;

/** Existing union (unchanged) */
export type SlotValue<C extends React.ComponentType<any>> =
  | C
  | string
  | Partial<React.ComponentProps<C>>;

/** Utility: concrete React elements for every slot */
type SlotElements<S> = { [K in keyof S]: React.ReactElement };

export type WithSlots<
  S extends Record<string, React.ComponentType<any>>,
  Rest = {},
> = {
  /** Per‑slot overrides */
  [K in keyof S]?: SlotValue<S[K]>;
} & {
  children?: (props: SlotElements<S> & Rest) => React.ReactNode;
} & Rest;

export function renderSlot<
  C extends React.ComponentType<any>,
  P = React.ComponentProps<C>,
>(
  slot: SlotValue<C> | undefined,
  DefaultComponent: C,
  props: P
): React.ReactElement {
  if (typeof slot === "string") {
    return React.createElement(DefaultComponent, {
      ...(props as P),
      className: slot,
    });
  }
  if (typeof slot === "function") {
    const Comp = slot as C;
    return React.createElement(Comp, props as P);
  }

  if (slot && typeof slot === "object" && !React.isValidElement(slot)) {
    return React.createElement(DefaultComponent, {
      ...(props as P),
      ...slot,
    });
  }

  return React.createElement(DefaultComponent, props as P);
}
