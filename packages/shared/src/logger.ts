import pino from "pino";

/**
 * Central logger for both frontend and backend.
 *
 * Dev: human-friendly, colorized output via pino-pretty when running in Node.
 * Prod: ultra-fast ndjson to stdout.
 */
const isNode = typeof process !== "undefined" && typeof window === "undefined";

export const logger = pino({
  level:
    (isNode ? process.env.LOG_LEVEL : undefined) ??
    (isNode && process.env.NODE_ENV === "production" ? "info" : "debug"),

  // Pretty-print only in Node development or when running interactively.
  transport:
    isNode && process.env.NODE_ENV !== "production" && process.stdout.isTTY
      ? {
          target: "pino-pretty", // ← loads the dev dependency
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname", // keep the log line short
          },
        }
      : undefined,
});
