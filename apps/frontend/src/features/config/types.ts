import type { AppRouterClient } from "@playbook-runner/api/v1/router"

export type ApiKey = NonNullable<
  Awaited<ReturnType<AppRouterClient["config"]["apiKeys"]["create"]>>
>

export type ApiKeyListItem = Awaited<
  ReturnType<AppRouterClient["config"]["apiKeys"]["list"]>
>[number]
