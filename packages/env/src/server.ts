import "dotenv/config"
import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    // Set to "0" to disable the in-process job scheduler (e.g. when running
    // multiple backend replicas and only one should schedule).
    JOB_SCHEDULER_ENABLED: z.enum(["0", "1"]).default("1"),

    GENERIC_OAUTH_CLIENT_ID: z.string().optional(),
    GENERIC_OAUTH_CLIENT_SECRET: z.string().optional(),
    GENERIC_OAUTH_ISSUER: z.url().optional(),

    // Default admin user created by `bun run db:seed`. Override in .env
    // for non-local environments. Password MUST be at least 8 chars
    // (Better Auth's minPasswordLength).
    SEED_ADMIN_EMAIL: z.email().default("admin@playbook-runner.local"),
    SEED_ADMIN_PASSWORD: z.string().min(8).default("admin1234"),
    SEED_ADMIN_NAME: z.string().default("Admin"),

    // Minimum severity for the structured (pino) logger. Default `info`;
    // set to `debug` while developing to surface verbose entries.
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace"])
      .default("info"),

    // gRPC with the ansible service. SERVICE_TOKEN is the same shared secret
    // that service reads as SERVICE_TOKEN — it guards both directions. Without
    // it the backend starts normally, but its gRPC server stays down and gRPC
    // endpoints return 503.
    SERVICE_TOKEN: z.string().min(32).optional(),

    // AES-256-GCM key for SSH private keys at rest: base64 of exactly 32
    // bytes. Generate with `openssl rand -base64 32`. Losing it makes every
    // stored private key unrecoverable — back it up like BETTER_AUTH_SECRET.
    CREDENTIALS_ENCRYPTION_KEY: z
      .string()
      .refine((value) => Buffer.from(value, "base64").length === 32, {
        message: "must be base64 of exactly 32 bytes",
      }),
    // The gateway's internal gRPC router, which forwards package `run` to the
    // Ansible runner (apps/gateway/Caddyfile). Compose sets gateway:50050.
    ANSIBLE_GRPC_TARGET: z.string().min(1).default("localhost:50050"),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
})
