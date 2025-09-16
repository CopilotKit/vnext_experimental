// Test setup file for Vitest
// Add any global test configuration here
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import React from "react";

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

// Mock canvas getContext used by audio recorder during tests
HTMLCanvasElement.prototype.getContext = () => {
  return {
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createImageData: () => ({ data: [] }),
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
  } as unknown as CanvasRenderingContext2D;
};

// Simplify Radix tooltip behavior to avoid act() noise in jsdom
vi.mock("@radix-ui/react-tooltip", async () => {
  const forward = (
    renderFn: React.ForwardRefRenderFunction<HTMLElement, any>
  ) => React.forwardRef(renderFn);

  const SimpleProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) =>
    React.createElement(React.Fragment, null, children);

  const SimplePortal: React.FC<{ children?: React.ReactNode }> = ({ children }) =>
    React.createElement(React.Fragment, null, children);

  const createWrapper = () =>
    forward(({ children, asChild, sideOffset: _sideOffset, ...rest }: any, ref) => {
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, { ref, ...rest });
      }
      return React.createElement("div", { ref, ...rest }, children);
    });

  const passthrough = createWrapper();

  return {
    Provider: SimpleProvider,
    Root: passthrough,
    Trigger: passthrough,
    Content: passthrough,
    Portal: SimplePortal,
    Arrow: () => null,
  };
});
