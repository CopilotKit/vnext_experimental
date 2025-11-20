"use client";

// Re-export AG-UI runtime and types to provide a single import surface
// `@ag-ui/client` already re-exports everything from `@ag-ui/core`, so exporting it
// alone avoids duplicate star exports that break certain bundlers (e.g. Next.js).
export * from "@ag-ui/client";

// React components and hooks for CopilotKit2
export * from "./components";
export * from "./hooks";
export * from "./providers";
export * from "./types";
export * from "./lib/react-core";
