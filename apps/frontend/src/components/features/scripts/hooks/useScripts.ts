import type { Script } from "@/components/features/scripts/types"
import { useHydratedQuery } from "@/hooks/useHydratedQuery"
import { useResourceMutation } from "@/hooks/useResourceMutation"
import { orpc } from "@/lib/orpc"

export const useScriptsList = () => {
  return useHydratedQuery(orpc.scripts.list.queryOptions())
}

export const useScriptGet = (id: string, options?: { enabled?: boolean }) => {
  return useHydratedQuery(
    orpc.scripts.get.queryOptions({
      input: { id },
      enabled: !!id && (options?.enabled ?? true),
    })
  )
}

const listKey = orpc.scripts.list.queryKey()

function applyCreateOptimistic(
  current: Script[] | undefined,
  input: {
    name: string
    description?: string
    content: string
    language: "bash" | "python"
  }
) {
  if (!current) return current
  const optimistic = {
    id: `__optimistic_${Date.now()}`,
    name: input.name,
    description: input.description ?? "",
    content: input.content,
    language: input.language,
  } as unknown as Script
  return [...current, optimistic]
}

function applyUpdateOptimistic(
  current: Script[] | undefined,
  input: {
    id: string
    name: string
    description?: string
    content: string
    language: "bash" | "python"
  }
) {
  if (!current) return current
  return current.map((script) =>
    script.id === input.id
      ? {
          ...script,
          name: input.name,
          description: input.description ?? script.description ?? null,
          content: input.content,
          language: input.language,
        }
      : script
  )
}

function applyDeleteOptimistic(
  current: Script[] | undefined,
  input: { id: string }
) {
  if (!current) return current
  return current.filter((script) => script.id !== input.id)
}

export const useScriptCreate = () =>
  useResourceMutation<
    {
      name: string
      description?: string
      content: string
      language: "bash" | "python"
    },
    Script,
    Script[]
  >({
    mutationFn: (input) =>
      orpc.scripts.create.call({
        name: input.name,
        description: input.description ?? "",
        content: input.content,
        language: input.language,
      }) as Promise<Script>,
    listKey,
    applyOptimistic: applyCreateOptimistic,
    messages: {
      success: "Script creado",
      error: "No se pudo crear el script",
    },
  })

export const useScriptUpdate = () =>
  useResourceMutation<
    {
      id: string
      name: string
      description?: string
      content: string
      language: "bash" | "python"
    },
    Script,
    Script[]
  >({
    mutationFn: (input) =>
      orpc.scripts.update.call({
        id: input.id,
        name: input.name,
        description: input.description ?? "",
        content: input.content,
        language: input.language,
      }) as Promise<Script>,
    listKey,
    applyOptimistic: applyUpdateOptimistic,
    messages: {
      success: "Script actualizado",
      error: "No se pudo actualizar el script",
    },
  })

export const useScriptDelete = () =>
  useResourceMutation<{ id: string }, Script, Script[]>({
    mutationFn: (input) => orpc.scripts.delete.call(input) as Promise<Script>,
    listKey,
    applyOptimistic: applyDeleteOptimistic,
    messages: {
      success: "Script eliminado",
      error: "No se pudo eliminar el script",
    },
  })
