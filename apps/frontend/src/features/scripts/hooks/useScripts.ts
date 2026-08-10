import { useTranslation } from "react-i18next"
import type { Script } from "@/features/scripts/types"
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

export const useScriptCreate = () => {
  const { t } = useTranslation("scripts")
  return (
    useResourceMutation <
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
      messages: { success: t("toast.created"), error: t("toast.create_error") },
    })
  )
}

export const useScriptUpdate = () => {
  const { t } = useTranslation("scripts")
  return useResourceMutation<
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
    messages: { success: t("toast.updated"), error: t("toast.update_error") },
  })
}

export const useScriptDelete = () => {
  const { t } = useTranslation("scripts")
  return useResourceMutation<{ id: string }, Script, Script[]>({
    mutationFn: (input) => orpc.scripts.delete.call(input) as Promise<Script>,
    listKey,
    applyOptimistic: applyDeleteOptimistic,
    messages: { success: t("toast.deleted"), error: t("toast.delete_error") },
  })
}
}
