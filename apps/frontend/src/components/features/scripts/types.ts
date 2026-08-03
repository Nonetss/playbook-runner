import type { AppRouterClient } from "@playbook-runner/api/v1/router"

export type Script = NonNullable<
  Awaited<ReturnType<AppRouterClient["scripts"]["get"]>>
>

export type ScriptList = Awaited<ReturnType<AppRouterClient["scripts"]["list"]>>
