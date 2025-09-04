// Angular + Zone - Using AnalogJS setup for proper Zone.js integration
import '@angular/compiler';
import '@analogjs/vitest-angular/setup-zone';

import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

// JSDOM polyfills commonly needed by Angular/CDK/components
// ResizeObserver
if (!(globalThis as any).ResizeObserver) {
  class RO {
    callback: ResizeObserverCallback;
    constructor(cb: ResizeObserverCallback) { this.callback = cb; }
    observe() { /* noop */ }
    unobserve() { /* noop */ }
    disconnect() { /* noop */ }
  }
  (globalThis as any).ResizeObserver = RO as any;
}

// IntersectionObserver
if (!(globalThis as any).IntersectionObserver) {
  class IO {
    constructor(_: IntersectionObserverCallback) {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
    root = null; rootMargin = ''; thresholds: number[] = [];
  }
  (globalThis as any).IntersectionObserver = IO as any;
}

// matchMedia
if (!window.matchMedia) {
  (window as any).matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// requestAnimationFrame
if (!globalThis.requestAnimationFrame) {
  (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16) as unknown as number;
  (globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
}

// Canvas context - provide a mock implementation for testing
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: function(contextType: string) {
    // Return mock context for testing
    return {
      fillRect: () => {}, clearRect: () => {}, getImageData: () => ({ data: [] }),
      putImageData: () => {}, createImageData: () => [], setTransform: () => {},
      drawImage: () => {}, save: () => {}, fillText: () => {}, restore: () => {},
      beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, closePath: () => {},
      stroke: () => {}, translate: () => {}, scale: () => {}, rotate: () => {},
      arc: () => {}, fill: () => {}, measureText: () => ({ width: 0 }),
      transform: () => {}, rect: () => {}, clip: () => {},
      lineWidth: 1, strokeStyle: '#000', fillStyle: '#000',
      canvas: this,
    };
  },
  writable: true,
  configurable: true
});

// DOMRect
if (!(globalThis as any).DOMRect) {
  (globalThis as any).DOMRect = class { constructor(public x=0, public y=0, public width=0, public height=0) {} } as any;
}

// Initialize Angular testing environment once
console.info('[vitest] test-setup.ts running in pid', process.pid);
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting()
);
console.info('[vitest] TestBed initialized');