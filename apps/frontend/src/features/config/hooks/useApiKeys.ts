import { useTranslation } from "react-i18next"
import type { ApiKey, ApiKeyListItem } from "@/features/config/types"
import { useHydratedQuery } from "@/hooks/useHydratedQuery"
import { useResourceMutation } from "@/hooks/useResourceMutation"
import { orpc } from "@/lib/orpc"

export const useApiKeysList = () => {
  return useHydratedQuery(orpc.config.apiKeys.list.queryOptions())
}

const listKey = orpc.config.apiKeys.list.queryKey()

type ApiKeyCreateInput = {
  name?: string
  expiresIn?: number
}

type ApiKeyDeleteOutput = { id: string; success: boolean }

function applyCreateOptimistic(
  current: ApiKeyListItem[] | undefined,
  input: ApiKeyCreateInput
) {
  if (!current) return current
  const now = new Date()
  const optimistic: ApiKeyListItem = {
    id: `__optimistic_${Date.now()}`,
    name: input.name ?? null,
    start: null,
    prefix: null,
    enabled: true,
    expiresAt: input.expiresIn
      ? new Date(now.getTime() + input.expiresIn * 1000)
      : null,
    createdAt: now,
  }
  return [...current, optimistic]
}

function applyDeleteOptimistic(
  current: ApiKeyListItem[] | undefined,
  input: { id: string }
) {
  if (!current) return current
  return current.filter((apiKey) => apiKey.id !== input.id)
}

export const useApiKeyCreate = () => {
  const { t } = useTranslation("config")
  return useResourceMutation<ApiKeyCreateInput, ApiKey, ApiKeyListItem[]>({
    mutationFn: (input) => orpc.config.apiKeys.create.call(input),
    listKey,
    applyOptimistic: applyCreateOptimistic,
    messages: {
      success: t("api_keys.toast_created"),
      error: t("api_keys.toast_create_error"),
    },
  })
}

export const useApiKeyDelete = () => {
  const { t } = useTranslation("config")
  return useResourceMutation<
    { id: string },
    ApiKeyDeleteOutput,
    ApiKeyListItem[]
  >({
    mutationFn: (input) =>
      orpc.config.apiKeys.delete.call(input) as Promise<ApiKeyDeleteOutput>,
    listKey,
    applyOptimistic: applyDeleteOptimistic,
    messages: {
      success: t("api_keys.toast_deleted"),
      error: t("api_keys.toast_delete_error"),
    },
  })
}
}
