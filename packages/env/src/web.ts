import { createEnv } from "@t3-oss/env-core"

export const env = createEnv({
  clientPrefix: "PUBLIC_",
  client: {},
  runtimeEnv: (import.meta as any).env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
})
