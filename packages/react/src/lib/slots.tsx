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

export function renderSlot<C extends React.ComponentType<any>>(
  slot: SlotValue<C> | undefined,
  DefaultComponent: C,
  props: Omit<React.ComponentProps<C>, "className">
): React.ReactElement {
  if (typeof slot === "string") {
    return (
      // @ts-expect-error
      <DefaultComponent
        {...(props as React.ComponentProps<C>)}
        className={slot}
      />
    );
  }
  if (typeof slot === "function") {
    const Comp = slot as C;
    return <Comp {...(props as React.ComponentProps<C>)} />;
  }

  if (slot && typeof slot === "object" && !React.isValidElement(slot)) {
    return (
      // @ts-expect-error
      <DefaultComponent {...(props as React.ComponentProps<C>)} {...slot} />
    );
  }

  return <DefaultComponent {...(props as React.ComponentProps<C>)} />;
}
