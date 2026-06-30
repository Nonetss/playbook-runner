import type { AppRouterClient } from "@none.stack/api/routers/index"

export type Playbook = NonNullable<
  Awaited<ReturnType<AppRouterClient["playbooks"]["get"]>>
>

export type PlaybookList = Awaited<
  ReturnType<AppRouterClient["playbooks"]["list"]>
>
