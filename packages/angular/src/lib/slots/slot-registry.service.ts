import { Injectable, TemplateRef, Type } from '@angular/core';

export type SlotType = 'class' | 'template' | 'component' | 'props' | 'value';

export interface SlotConfig {
  type: SlotType;
  value: any;
}

/**
 * Service for managing slot registrations across the application.
 * Supports nested slot paths like "chat.input.sendButton"
 */
@Injectable({
  providedIn: 'root'
})
export class SlotRegistryService {
  private slots = new Map<string, SlotConfig>();
  
  /**
   * Register a slot with its configuration
   */
  register(path: string, config: SlotConfig): void {
    this.slots.set(path, config);
  }
  
  /**
   * Get a slot configuration by path
   */
  get(path: string): SlotConfig | undefined {
    return this.slots.get(path);
  }
  
  /**
   * Get the slot value with type checking
   */
  getValue<T = any>(path: string): T | undefined {
    const config = this.get(path);
    return config?.value as T;
  }
  
  /**
   * Get the slot type
   */
  getType(path: string): SlotType | undefined {
    return this.get(path)?.type;
  }
  
  /**
   * Check if a slot is registered
   */
  has(path: string): boolean {
    return this.slots.has(path);
  }
  
  /**
   * Clear a specific slot
   */
  clear(path: string): void {
    this.slots.delete(path);
  }
  
  /**
   * Clear all slots with a specific prefix
   */
  clearPrefix(prefix: string): void {
    const keys = Array.from(this.slots.keys());
    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        this.slots.delete(key);
      }
    });
  }
  
  /**
   * Get all slots with a specific prefix
   */
  getByPrefix(prefix: string): Map<string, SlotConfig> {
    const result = new Map<string, SlotConfig>();
    this.slots.forEach((value, key) => {
      if (key.startsWith(prefix)) {
        result.set(key, value);
      }
    });
    return result;
  }
  
  /**
   * Clear all slots
   */
  clearAll(): void {
    this.slots.clear();
  }
}