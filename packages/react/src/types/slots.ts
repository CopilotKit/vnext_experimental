export type SlotConfig<ComponentType> =
  | { component: ComponentType; className?: never }
  | { className: string; component?: never };

export type Slots<S extends Record<string, React.ComponentType<any>>> = {
  [Name in keyof S]?: SlotConfig<S[Name]>;
} & {
  children?: (slots: { [K in keyof S]: React.ReactElement }) => React.ReactNode;
};
