import { env } from "@playbook-runner/env/server"
import { pino } from "pino"

const isProd = env.NODE_ENV === "production"

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: "playbook-runner" },
  ...(isProd
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        },
      }),
})

/** Bindings shape for `logger.child` calls. */
export type LogBindings = Record<string, unknown>

/** Return a child logger with the given bindings merged into every log entry. */
export function child(bindings: LogBindings) {
  return logger.child(bindings)
}
