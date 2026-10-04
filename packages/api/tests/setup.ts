// Preloaded by `bun test` (see the `test` script). Unit tests import modules
// that validate `@playbook-runner/env/server` on import, so give them a
// complete, deterministic environment instead of the developer's `.env`.
// Always overwrite: exported shell variables must not leak into the tests.
// Nothing here is ever contacted — unit tests never query the database.
Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: "postgres://test:test@127.0.0.1:1/test",
  BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-00",
  BETTER_AUTH_URL: "http://localhost:3000",
  CORS_ORIGIN: "http://localhost:4321",
  SERVICE_TOKEN: "test-service-token-test-service-token",
  // base64 of 32 bytes 0x00..0x1f
  CREDENTIALS_ENCRYPTION_KEY: Buffer.from(
    Array.from({ length: 32 }, (_, i) => i)
  ).toString("base64"),
  LOG_LEVEL: "fatal",
})
