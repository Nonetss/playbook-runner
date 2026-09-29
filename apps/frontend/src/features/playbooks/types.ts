import type { AppRouterClient } from "@playbook-runner/api/v1/router"

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

export type PlaybookRepository = NonNullable<
  Awaited<ReturnType<AppRouterClient["repositories"]["get"]>>
>

export type PlaybookRepositoryList = Awaited<
  ReturnType<AppRouterClient["repositories"]["list"]>
>
