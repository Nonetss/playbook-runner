import { env } from "@playbook-runner/env/server"

/**
 * The env every module sees: `tests/setup.ts` installs it as
 * `@playbook-runner/env/server`. It starts as a copy of the validated
 * placeholder env, with `SERVICE_TOKEN` set (gRPC on) and SSO off; a test
 * flips one (`testEnv.SERVICE_TOKEN = undefined`). Call `resetEnv()` in
 * `beforeEach`.
 */
const initial = { ...env }

export const testEnv = { ...env }

export function resetEnv() {
  Object.assign(testEnv, initial, {
    GENERIC_OAUTH_CLIENT_ID: undefined,
    GENERIC_OAUTH_CLIENT_SECRET: undefined,
    GENERIC_OAUTH_ISSUER: undefined,
  })
}
