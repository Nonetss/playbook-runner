import type { AppRouterClient } from "@playbook-runner/api/routers/index"

export type Credential = Awaited<
  ReturnType<AppRouterClient["credentials"]["list"]>
>[number]
