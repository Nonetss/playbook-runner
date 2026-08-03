import { env } from "@playbook-runner/env/server"
import pino, { type Logger, type LoggerOptions } from "pino"

const isProduction = env.NODE_ENV === "production"

const options: LoggerOptions = {
  level: env.LOG_LEVEL,
  base: { service: "playbook-runner-backend" },
  timestamp: pino.stdTimeFunctions.isoTime,
}

export const logger: Logger = isProduction
  ? pino(options)
  : pino({
      ...options,
      transport: {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss.l" },
      },
    })

/** Bindings shape for `logger.child` calls. */
export type LogBindings = Record<string, unknown>

/** Return a child logger with the given bindings merged into every log entry. */
export function child(bindings: LogBindings) {
  return logger.child(bindings)
}
