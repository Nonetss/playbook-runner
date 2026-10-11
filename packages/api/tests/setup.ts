import { mock } from "bun:test"

import { fakeDb } from "#tests/fixtures/db"

/**
 * Preloaded before every test file (`bunfig.toml`). Importing the procedure
 * builders pulls in `@playbook-runner/auth` and `@playbook-runner/db`, which
 * validate `@playbook-runner/env/server` on import. These values satisfy that
 * validation and are overwritten, not defaulted: turbo passes the shell's
 * real env through, and a unit test must never reach a real database or
 * service.
 */
const placeholders = {
  NODE_ENV: "test",
  // Port 1 on loopback refuses connections, and `@playbook-runner/db` is
  // replaced by the fake below, so nothing ever dials it.
  DATABASE_URL: "postgres://unit-test:unit-test@127.0.0.1:1/unit_test",
  BETTER_AUTH_SECRET: "unit-test-secret-at-least-32-characters-long",
  BETTER_AUTH_URL: "http://localhost:3000",
  CORS_ORIGIN: "http://localhost:4321",
  SERVICE_TOKEN: "unit-test-service-token-at-least-32-chars",
  // base64 of 32 bytes 0x00..0x1f
  CREDENTIALS_ENCRYPTION_KEY: Buffer.from(
    Array.from({ length: 32 }, (_, i) => i)
  ).toString("base64"),
  ANSIBLE_GRPC_TARGET: "grpc.test:50050",
  JOB_SCHEDULER_ENABLED: "0",
  LOG_LEVEL: "fatal",
}

/**
 * Optional vars that switch on integrations or skip validation. Set to ""
 * rather than deleted: `@playbook-runner/env/server` loads a `.env` with
 * dotenv, which refills unset vars but never overrides a set one, and
 * `emptyStringAsUndefined` then reads "" as unset.
 */
const cleared = [
  "SKIP_ENV_VALIDATION",
  "GENERIC_OAUTH_CLIENT_ID",
  "GENERIC_OAUTH_CLIENT_SECRET",
  "GENERIC_OAUTH_ISSUER",
]

Object.assign(process.env, placeholders)
for (const name of cleared) process.env[name] = ""

// `mock.module` holds for the whole run, so each process-wide boundary is
// replaced once, here, with a shared fake the tests reconfigure and reset; a
// per-file mock would leak into other files. The env and gRPC fixtures are
// imported dynamically: a static import would validate the env before the
// placeholders above are in place.
mock.module("@playbook-runner/db", () => ({
  db: fakeDb.db,
  createDb: () => fakeDb.db,
}))

const { testEnv } = await import("#tests/fixtures/env")
mock.module("@playbook-runner/env/server", () => ({ env: testEnv }))

const realGrpc = await import("@playbook-runner/grpc/client")
const { authMetadata } = await import("@playbook-runner/grpc/auth")
const { getClient, grpc } = await import("#tests/fixtures/grpc")
mock.module("@playbook-runner/grpc", () => ({
  ...realGrpc,
  authMetadata,
  getClient,
  unary: grpc.unary,
  serverStream: grpc.serverStream,
}))
