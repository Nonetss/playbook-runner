import type { AppRouterClient } from "@playbook-runner/api/routers/index"

export type Playbook = NonNullable<
  Awaited<ReturnType<AppRouterClient["playbooks"]["get"]>>
>

export type PlaybookList = Awaited<
  ReturnType<AppRouterClient["playbooks"]["list"]>
>

export type PlaybookFolder = NonNullable<
  Awaited<ReturnType<AppRouterClient["playbooks"]["folders"]["get"]>>
>

export type PlaybookFolderList = Awaited<
  ReturnType<AppRouterClient["playbooks"]["folders"]["list"]>
>
