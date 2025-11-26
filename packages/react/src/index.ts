"use client";

// Re-export AG-UI client runtime and types from a single import surface.
// Avoid re-exporting @ag-ui/core to prevent star-export name collisions.
export * from "@ag-ui/client";

// React components and hooks for CopilotKit2
export * from "./components";
export * from "./hooks";
export * from "./providers";
export * from "./types";
export * from "./lib/react-core";
