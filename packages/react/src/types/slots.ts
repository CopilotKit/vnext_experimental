export type SlotComponentOrClassName<ComponentType> = ComponentType | string;

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
