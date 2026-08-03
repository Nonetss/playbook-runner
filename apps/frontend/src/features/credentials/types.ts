import type { AppRouterClient } from "@playbook-runner/api/v1/router"

export type Credential = Awaited<
  ReturnType<AppRouterClient["credentials"]["list"]>
>[number]
