// Angular testing setup without jest-preset-angular helper
import 'zone.js';
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { jest as jestGlobals } from '@jest/globals';

// Initialize Angular testing environment once
const testBed = getTestBed();
// TestBed.platform is undefined until initialization
if (!(testBed as any).platform) {
  testBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
    { teardown: { destroyAfterEach: true } }
  );
}

// Basic JSDOM polyfills commonly needed by Angular/CDK/components
if (!(globalThis as any).ResizeObserver) {
  class RO {
    callback: ResizeObserverCallback;
    constructor(cb: ResizeObserverCallback) { this.callback = cb; }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as any).ResizeObserver = RO as any;
}

if (!(globalThis as any).IntersectionObserver) {
  class IO {
    constructor(_: IntersectionObserverCallback) {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
    root = null; rootMargin = ''; thresholds: number[] = [];
  }
  ;(globalThis as any).IntersectionObserver = IO as any;
}

if (!(window as any).matchMedia) {
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

if (!globalThis.requestAnimationFrame) {
  (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16) as unknown as number;
  (globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
}

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: function() {
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
    } as any;
  },
  writable: true,
  configurable: true,
});

if (!(globalThis as any).DOMRect) {
  (globalThis as any).DOMRect = class { constructor(public x=0, public y=0, public width=0, public height=0) {} } as any;
}

// Vitest compatibility shim to minimize test refactors
// Map vi.* calls to Jest's API
{
  const j: any = jestGlobals as any;
  (globalThis as any).vi = {
    ...j,
    fn: j.fn?.bind?.(j),
    spyOn: j.spyOn?.bind?.(j),
    mock: j.mock?.bind?.(j),
    doMock: j.doMock?.bind?.(j),
    unmock: j.unmock?.bind?.(j),
    clearAllMocks: j.clearAllMocks?.bind?.(j),
    resetAllMocks: j.resetAllMocks?.bind?.(j),
    restoreAllMocks: j.restoreAllMocks?.bind?.(j),
    useFakeTimers: j.useFakeTimers?.bind?.(j),
    useRealTimers: j.useRealTimers?.bind?.(j),
    advanceTimersByTime: j.advanceTimersByTime?.bind?.(j),
    setSystemTime: j.setSystemTime?.bind?.(j),
  };
}
