import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { selectableRoles } from "@/features/playbooks/lib/playbook-roles"
import type {
  Playbook,
  PlaybookRepository,
  PlaybookRepositoryList,
} from "@/features/playbooks/types"
import { useHydratedQuery } from "@/hooks/use-hydrated-query"
import { useResourceMutation } from "@/hooks/use-resource-mutation"
import { orpc } from "@/lib/orpc"

export type RepositoryInput = {
  name: string
  url: string
  branch: string
  subdir: string | null
  credentialId: string | null
}

export function useRepositoriesList() {
  return useHydratedQuery(orpc.repositories.list.queryOptions())
}

/** Roles of the synced commit; `enabled` while the repository is expanded. */
/** The same query as the repository's section, so they share the cache. */
export function usePlaybookRoles(
  playbook: Pick<Playbook, "repositoryId" | "path"> | undefined
) {
  const repositoryId = playbook?.repositoryId
  const { data } = useHydratedQuery(
    orpc.repositories.roles.queryOptions({
      input: { id: repositoryId ?? "" },
      enabled: !!repositoryId,
      retry: false,
    })
  )
  return useMemo(
    () => (data ? selectableRoles(data, playbook?.path ?? null) : []),
    [data, playbook?.path]
  )
}

export function useRepositoryRoles(
  repository: Pick<PlaybookRepository, "id" | "lastCommitSha">,
  enabled: boolean
) {
  return useHydratedQuery(
    orpc.repositories.roles.queryOptions({
      input: { id: repository.id },
      enabled: enabled && !!repository.lastCommitSha,
      retry: false,
    })
  )
}

const listKey = orpc.repositories.list.queryKey()
const playbookListKey = orpc.playbooks.list.queryKey()
const rolesKey = orpc.repositories.roles.key()

export function useRepositoryCreate() {
  const { t } = useTranslation("playbooks")
  return useResourceMutation<
    RepositoryInput,
    PlaybookRepository,
    PlaybookRepositoryList
  >({
    mutationFn: (input) =>
      orpc.repositories.create.call(input) as Promise<PlaybookRepository>,
    listKey,
    messages: {
      success: t("repository.toast_created"),
      error: t("repository.toast_create_error"),
    },
  })
}

export function useRepositoryUpdate() {
  const { t } = useTranslation("playbooks")
  return useResourceMutation<
    RepositoryInput & { id: string },
    PlaybookRepository,
    PlaybookRepositoryList
  >({
    mutationFn: (input) =>
      orpc.repositories.update.call(input) as Promise<PlaybookRepository>,
    listKey,
    applyOptimistic: (current, input) =>
      current?.map((repository) =>
        repository.id === input.id ? { ...repository, ...input } : repository
      ),
    messages: {
      success: t("repository.toast_updated"),
      error: t("repository.toast_update_error"),
    },
  })
}

export function useRepositoryDelete() {
  const { t } = useTranslation("playbooks")
  return useResourceMutation<
    { id: string },
    PlaybookRepository,
    PlaybookRepositoryList
  >({
    mutationFn: (input) =>
      orpc.repositories.delete.call(input) as Promise<PlaybookRepository>,
    listKey,
    extraInvalidate: [playbookListKey],
    applyOptimistic: (current, input) =>
      current?.filter((repository) => repository.id !== input.id),
    messages: {
      success: t("repository.toast_deleted"),
      error: t("repository.toast_delete_error"),
    },
  })
}

export function useRepositorySync() {
  const { t } = useTranslation("playbooks")
  return useResourceMutation<{ id: string }, unknown, PlaybookRepositoryList>({
    mutationFn: (input) => orpc.repositories.sync.call(input),
    listKey,
    extraInvalidate: [playbookListKey, rolesKey],
    messages: {
      success: t("repository.toast_synced"),
      error: t("repository.toast_sync_error"),
    },
  })
}
