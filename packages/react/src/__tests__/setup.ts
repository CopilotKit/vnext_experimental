// Test setup file for Vitest
// Add any global test configuration here

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
