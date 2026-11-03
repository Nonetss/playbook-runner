import { useTranslation } from "react-i18next"
import type { InfisicalConnection } from "@/features/infisical/types"
import { useHydratedQuery } from "@/hooks/use-hydrated-query"
import { useResourceMutation } from "@/hooks/use-resource-mutation"
import { orpc } from "@/lib/orpc"

type ConnectionFields = {
  name: string
  url: string
  clientId: string
  projectId: string
}

type CreateInput = ConnectionFields & { clientSecret: string }

type UpdateInput = ConnectionFields & {
  id: string
  // Omitted: keep the stored client secret.
  clientSecret?: string
}

export const useInfisicalConnectionsList = () =>
  useHydratedQuery(orpc.infisicalConnections.list.queryOptions())

export const useInfisicalEnvironments = (id: string) =>
  useHydratedQuery(
    orpc.infisicalConnections.environments.queryOptions({
      input: { id },
      enabled: !!id,
      retry: false,
    })
  )

export const useInfisicalSecretNames = (
  id: string,
  environment: string,
  secretPath: string
) =>
  useHydratedQuery(
    orpc.infisicalConnections.secretNames.queryOptions({
      input: { id, environment, secretPath },
      enabled: !!id && !!environment,
      retry: false,
    })
  )

const listKey = orpc.infisicalConnections.list.queryKey()

const detailKey = (input: { id: string }) =>
  orpc.infisicalConnections.get.queryKey({ input: { id: input.id } })

function applyCreateOptimistic(
  current: InfisicalConnection[] | undefined,
  input: CreateInput
) {
  if (!current) return current
  const optimistic: InfisicalConnection = {
    id: `optimistic-${Date.now()}`,
    name: input.name,
    url: input.url,
    clientId: input.clientId,
    projectId: input.projectId,
    createdAt: null,
    updatedAt: null,
  }
  return [...current, optimistic]
}

function applyUpdateOptimistic(
  current: InfisicalConnection[] | undefined,
  input: UpdateInput
) {
  if (!current) return current
  return current.map((connection) =>
    connection.id === input.id
      ? {
          ...connection,
          name: input.name,
          url: input.url,
          clientId: input.clientId,
          projectId: input.projectId,
        }
      : connection
  )
}

function applyDeleteOptimistic(
  current: InfisicalConnection[] | undefined,
  input: { id: string }
) {
  if (!current) return current
  return current.filter((connection) => connection.id !== input.id)
}

export const useInfisicalConnectionCreate = () => {
  const { t } = useTranslation("infisical")
  return useResourceMutation<
    CreateInput,
    InfisicalConnection,
    InfisicalConnection[]
  >({
    mutationFn: (input) => orpc.infisicalConnections.create.call(input),
    listKey,
    applyOptimistic: applyCreateOptimistic,
    messages: { success: t("toast.created"), error: t("toast.create_error") },
  })
}

export const useInfisicalConnectionUpdate = () => {
  const { t } = useTranslation("infisical")
  return useResourceMutation<
    UpdateInput,
    InfisicalConnection,
    InfisicalConnection[]
  >({
    mutationFn: (input) => orpc.infisicalConnections.update.call(input),
    listKey,
    detailKey,
    applyOptimistic: applyUpdateOptimistic,
    messages: { success: t("toast.updated"), error: t("toast.update_error") },
  })
}

export const useInfisicalConnectionDelete = () => {
  const { t } = useTranslation("infisical")
  return useResourceMutation<
    { id: string },
    InfisicalConnection,
    InfisicalConnection[]
  >({
    mutationFn: (input) => orpc.infisicalConnections.delete.call(input),
    listKey,
    detailKey,
    removeDetail: true,
    applyOptimistic: applyDeleteOptimistic,
    messages: { success: t("toast.deleted"), error: t("toast.delete_error") },
  })
}
