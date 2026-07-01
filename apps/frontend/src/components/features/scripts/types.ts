import type { AppRouterClient } from "@playbook-runner/api/routers/index"

export type Script = NonNullable<
  Awaited<ReturnType<AppRouterClient["scripts"]["get"]>>
>

export type ScriptList = Awaited<ReturnType<AppRouterClient["scripts"]["list"]>>
