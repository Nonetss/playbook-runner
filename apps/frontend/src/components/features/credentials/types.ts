import type { AppRouterClient } from "@none.stack/api/routers/index"

export type Credential = Awaited<
  ReturnType<AppRouterClient["credentials"]["list"]>
>[number]
