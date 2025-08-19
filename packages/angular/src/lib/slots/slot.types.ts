import { Type, TemplateRef, InjectionToken } from '@angular/core';

/**
 * Represents a value that can be used as a slot override.
 * Can be a component type, template reference, CSS class string, or property overrides.
 */
export type SlotValue<T = any> = 
  | Type<T>
  | TemplateRef<T>
  | string
  | Partial<T>;

/**
 * Configuration for a slot
 */
export interface SlotConfig<T = any> {
  value?: SlotValue<T>;
  props?: Partial<T>;
  class?: string;
  default?: Type<T>;
}

/**
 * Context passed to slot templates
 */
export interface SlotContext<T = any> {
  $implicit: T;
  props?: Partial<T>;
  [key: string]: any;
}

/**
 * Slot registry entry
 */
export interface SlotRegistryEntry<T = any> {
  component?: Type<T>;
  template?: TemplateRef<T>;
  class?: string;
  props?: Partial<T>;
}

/**
 * Options for rendering a slot
 */
export interface RenderSlotOptions<T = any> {
  slot?: SlotValue<T>;
  defaultComponent: Type<T>;
  props?: T;
  injector?: any;
}

/**
 * Injection token for slot configuration
 */
export const SLOT_CONFIG = new InjectionToken<Map<string, SlotRegistryEntry>>('SLOT_CONFIG');

/**
 * Type for components with slots
 */
export type WithSlots<S extends Record<string, Type<any>>, Rest = object> = {
  [K in keyof S as `${string & K}Component`]?: Type<any>;
} & {
  [K in keyof S as `${string & K}Template`]?: TemplateRef<any>;
} & {
  [K in keyof S as `${string & K}Class`]?: string;
} & Rest;