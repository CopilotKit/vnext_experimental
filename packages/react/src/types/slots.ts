export type SlotComponentOrClassName<ComponentType> = ComponentType | string;

export type Slots<
  S extends Record<string, SlotComponentOrClassName<any>>,
  P = {},
> = {
  [Name in keyof S]?: SlotComponentOrClassName<S[Name]>;
} & P & {
    children?: (
      props: { [K in keyof S]: React.ReactElement } & P
    ) => React.ReactNode;
  };
