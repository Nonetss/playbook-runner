import { useTranslation } from "react-i18next"
import type { Playbook } from "@/components/features/playbooks/types"
import { useHydratedQuery } from "@/hooks/useHydratedQuery"
import { useResourceMutation } from "@/hooks/useResourceMutation"
import { orpc } from "@/lib/orpc"

export const usePlaybooksList = () => {
  return useHydratedQuery(orpc.playbooks.list.queryOptions())
}

export const usePlaybookGet = (id: string, options?: { enabled?: boolean }) => {
  return useHydratedQuery(
    orpc.playbooks.get.queryOptions({
      input: { id },
      enabled: !!id && (options?.enabled ?? true),
    })
  )
}

const listKey = orpc.playbooks.list.queryKey()

function applyCreateOptimistic(
  current: Playbook[] | undefined,
  input: {
    name: string
    description?: string
    content: string
    folderId?: string | null
  }
) {
  if (!current) return current
  const optimistic = {
    id: `__optimistic_${Date.now()}`,
    name: input.name,
    description: input.description ?? "",
    content: input.content,
    folderId: input.folderId ?? null,
  } as unknown as Playbook
  return [...current, optimistic]
}

function applyUpdateOptimistic(
  current: Playbook[] | undefined,
  input: {
    id: string
    name: string
    description?: string
    content: string
    folderId?: string | null
  }
) {
  if (!current) return current
  return current.map((playbook) =>
    playbook.id === input.id
      ? {
          ...playbook,
          name: input.name,
          description: input.description ?? playbook.description ?? null,
          content: input.content,
          folderId: input.folderId ?? null,
        }
      : playbook
  )
}

function applyDeleteOptimistic(
  current: Playbook[] | undefined,
  input: { id: string }
) {
  if (!current) return current
  return current.filter((playbook) => playbook.id !== input.id)
}

export function usePlaybookCreate() {
  const { t } = useTranslation("playbooks")
  return useResourceMutation<
    {
      name: string
      description?: string
      content: string
      folderId?: string | null
    },
    Playbook,
    Playbook[]
  >({
    mutationFn: (input) =>
      orpc.playbooks.create.call({
        name: input.name,
        description: input.description ?? "",
        content: input.content,
        folderId: input.folderId ?? null,
      }) as Promise<Playbook>,
    listKey,
    applyOptimistic: applyCreateOptimistic,
    messages: {
      success: t("toast.created"),
      error: t("toast.create_error"),
    },
  })
}

export function usePlaybookUpdate() {
  const { t } = useTranslation("playbooks")
  return useResourceMutation<
    {
      id: string
      name: string
      description?: string
      content: string
      folderId?: string | null
    },
    Playbook,
    Playbook[]
  >({
    mutationFn: (input) =>
      orpc.playbooks.update.call({
        id: input.id,
        name: input.name,
        description: input.description ?? "",
        content: input.content,
        folderId: input.folderId ?? null,
      }) as Promise<Playbook>,
    listKey,
    applyOptimistic: applyUpdateOptimistic,
    messages: {
      success: t("toast.updated"),
      error: t("toast.update_error"),
    },
  })
}

export function usePlaybookDelete() {
  const { t } = useTranslation("playbooks")
  return useResourceMutation<{ id: string }, Playbook, Playbook[]>({
    mutationFn: (input) =>
      orpc.playbooks.delete.call(input) as Promise<Playbook>,
    listKey,
    applyOptimistic: applyDeleteOptimistic,
    messages: {
      success: t("toast.deleted"),
      error: t("toast.delete_error"),
    },
  })
}

export function usePlaybookMove() {
  const { t } = useTranslation("playbooks")
  return useResourceMutation<
    { id: string; folderId: string | null },
    Playbook,
    Playbook[]
  >({
    mutationFn: (input) => orpc.playbooks.move.call(input) as Promise<Playbook>,
    listKey,
    applyOptimistic: (current, input) =>
      current?.map((playbook) =>
        playbook.id === input.id
          ? { ...playbook, folderId: input.folderId }
          : playbook
      ),
    messages: {
      success: t("move.success"),
      error: t("move.error"),
    },
  })
}
