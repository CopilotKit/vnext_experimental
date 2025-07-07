import pino from "pino";

/**
 * Central logger for the entire application.
 *
 * Dev: human-friendly, colorized output via pino-pretty.
 * Prod: ultra-fast ndjson to stdout.
 */
export const logger = pino({
  level:
    process.env.LOG_LEVEL ??
    (process.env.NODE_ENV === "production" ? "info" : "debug"),

  // Pretty-print only in development or when running interactively.
  transport:
    process.env.NODE_ENV !== "production" && process.stdout.isTTY
      ? {
          target: "pino-pretty", // ← loads the dev dependency
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname", // keep the log line short
          },
        }
      : undefined, // ← raw JSON in production
});
