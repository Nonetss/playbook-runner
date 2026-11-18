import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import type {
  Credential,
  CredentialCreateInput,
  CredentialScope,
} from "@/features/credentials/types"
import { useHydratedQuery } from "@/hooks/use-hydrated-query"
import { useResourceMutation } from "@/hooks/use-resource-mutation"
import { orpc } from "@/lib/orpc"

/**
 * Every credential, or only those for one purpose. The cache holds the whole
 * list (mutations update it), so each page filters what it shows.
 */
export const useCredentialsList = (scope?: CredentialScope) => {
  return useHydratedQuery(
    orpc.credentials.list.queryOptions({
      select: scope
        ? (rows) => rows.filter((row) => row.scope === scope)
        : undefined,
    })
  )
}

export const useCredentialGet = (
  id: string,
  options?: { enabled?: boolean }
) => {
  return useHydratedQuery(
    orpc.credentials.get.queryOptions({
      input: { id },
      enabled: !!id && (options?.enabled ?? true),
    })
  )
}

const listKey = orpc.credentials.list.queryKey()

const detailKey = (input: { id: string }) =>
  orpc.credentials.get.queryKey({ input: { id: input.id } })

function applyCreateOptimistic(
  current: Credential[] | undefined,
  input: CredentialCreateInput
) {
  if (!current) return current
  const optimistic = {
    id: `optimistic-${Date.now()}`,
    type: input.type,
    scope: input.scope,
    name: input.name,
    username: input.username,
    publicKey: input.type === "ssh_key" ? input.publicKey : null,
  } as unknown as Credential
  return [...current, optimistic]
}

function applyUpdateOptimistic(
  current: Credential[] | undefined,
  input: {
    id: string
    name: string
    username: string
    privateKey?: string
    publicKey?: string
    token?: string
  }
) {
  if (!current) return current
  return current.map((credential) =>
    String(credential.id) === String(input.id)
      ? {
          ...credential,
          name: input.name,
          username: input.username,
          publicKey: input.publicKey ?? credential.publicKey,
        }
      : credential
  )
}

function applyDeleteOptimistic(
  current: Credential[] | undefined,
  input: { id: string }
) {
  if (!current) return current
  return current.filter(
    (credential) => String(credential.id) !== String(input.id)
  )
}

export const useCredentialCreate = () => {
  const { t } = useTranslation("credentials")
  return useResourceMutation<CredentialCreateInput, Credential, Credential[]>({
    mutationFn: (input) =>
      orpc.credentials.create.call(input) as Promise<Credential>,
    listKey,
    applyOptimistic: applyCreateOptimistic,
    messages: { success: t("toast.created"), error: t("toast.create_error") },
  })
}

export const useCredentialUpdate = () => {
  const { t } = useTranslation("credentials")
  return useResourceMutation<
    {
      id: string
      name: string
      username: string
      // Omitted: keep the stored private key or token.
      privateKey?: string
      publicKey?: string
      token?: string
    },
    Credential,
    Credential[]
  >({
    mutationFn: (input) =>
      orpc.credentials.update.call(input) as Promise<Credential>,
    listKey,
    detailKey,
    applyOptimistic: applyUpdateOptimistic,
    messages: { success: t("toast.updated"), error: t("toast.update_error") },
  })
}

export const useCredentialGenerate = () =>
  useMutation(orpc.credentials.generate.mutationOptions())

export const useCredentialDelete = () => {
  const { t } = useTranslation("credentials")
  return useResourceMutation<{ id: string }, Credential, Credential[]>({
    mutationFn: (input) =>
      orpc.credentials.delete.call(input) as Promise<Credential>,
    listKey,
    detailKey,
    removeDetail: true,
    applyOptimistic: applyDeleteOptimistic,
    messages: { success: t("toast.deleted"), error: t("toast.delete_error") },
  })
}
