export type SlotComponentOrClassName<ComponentType> = ComponentType | string;

export type Slots<S extends Record<string, SlotComponentOrClassName<any>>> = {
  [Name in keyof S]?: SlotComponentOrClassName<S[Name]>;
} & {
  children?: (slots: { [K in keyof S]: React.ReactElement }) => React.ReactNode;
};
