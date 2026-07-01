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
  input: { name: string; description?: string; content: string }
) {
  if (!current) return current
  const optimistic = {
    id: `__optimistic_${Date.now()}`,
    name: input.name,
    description: input.description ?? "",
    content: input.content,
  } as unknown as Playbook
  return [...current, optimistic]
}

function applyUpdateOptimistic(
  current: Playbook[] | undefined,
  input: { id: string; name: string; description?: string; content: string }
) {
  if (!current) return current
  return current.map((playbook) =>
    playbook.id === input.id
      ? {
          ...playbook,
          name: input.name,
          description: input.description ?? playbook.description ?? null,
          content: input.content,
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

export const usePlaybookCreate = () =>
  useResourceMutation<
    { name: string; description?: string; content: string },
    Playbook,
    Playbook[]
  >({
    mutationFn: (input) =>
      orpc.playbooks.create.call({
        name: input.name,
        description: input.description ?? "",
        content: input.content,
      }) as Promise<Playbook>,
    listKey,
    applyOptimistic: applyCreateOptimistic,
    messages: {
      success: "Playbook creado",
      error: "No se pudo crear el playbook",
    },
  })

export const usePlaybookUpdate = () =>
  useResourceMutation<
    { id: string; name: string; description?: string; content: string },
    Playbook,
    Playbook[]
  >({
    mutationFn: (input) =>
      orpc.playbooks.update.call({
        id: input.id,
        name: input.name,
        description: input.description ?? "",
        content: input.content,
      }) as Promise<Playbook>,
    listKey,
    applyOptimistic: applyUpdateOptimistic,
    messages: {
      success: "Playbook actualizado",
      error: "No se pudo actualizar el playbook",
    },
  })

export const usePlaybookDelete = () =>
  useResourceMutation<{ id: string }, Playbook, Playbook[]>({
    mutationFn: (input) =>
      orpc.playbooks.delete.call(input) as Promise<Playbook>,
    listKey,
    applyOptimistic: applyDeleteOptimistic,
    messages: {
      success: "Playbook eliminado",
      error: "No se pudo eliminar el playbook",
    },
  })
