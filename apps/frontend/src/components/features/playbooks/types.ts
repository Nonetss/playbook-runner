import type { AppRouterClient } from "@playbook-runner/api/routers/index"

export type Playbook = NonNullable<
  Awaited<ReturnType<AppRouterClient["playbooks"]["get"]>>
>

export type PlaybookList = Awaited<
  ReturnType<AppRouterClient["playbooks"]["list"]>
>
