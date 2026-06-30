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
    // Base URL of the ansible execution service (FastAPI). Used by the job
    // scheduler to trigger runs.
    ANSIBLE_URL: z.url().default("http://localhost:8000"),
    // Shared secret guarding the ansible service's internal run endpoint. Must
    // match the ansible app's INTERNAL_TOKEN.
    INTERNAL_TOKEN: z.string().default(""),
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
    SEED_ADMIN_PASSWORD: z
      .string()
      .min(8)
      .default("admin1234"),
    SEED_ADMIN_NAME: z.string().default("Admin"),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
})
