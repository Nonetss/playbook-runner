import { createEnv } from "@t3-oss/env-core"

export const env = createEnv({
  clientPrefix: "PUBLIC_",
  client: {},
  runtimeEnv: import.meta.env,
  skipValidation: import.meta.env.SKIP_ENV_VALIDATION === "1",
  emptyStringAsUndefined: true,
})
