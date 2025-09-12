// Test setup file for Vitest
// Add any global test configuration here
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Mock ResizeObserver which is not available in jsdom
global.ResizeObserver = class ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    // Store callback for potential future use
    this.callback = callback;
  }
  callback: ResizeObserverCallback;
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Ensure we cleanup between tests to avoid lingering handles
afterEach(() => {
  cleanup();
});
