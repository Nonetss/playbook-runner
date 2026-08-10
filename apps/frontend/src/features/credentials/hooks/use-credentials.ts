import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import type { Credential } from "@/features/credentials/types"
import { useHydratedQuery } from "@/hooks/useHydratedQuery"
import { useResourceMutation } from "@/hooks/useResourceMutation"
import { orpc } from "@/lib/orpc"

export const useCredentialsList = () => {
  return useHydratedQuery(orpc.credentials.list.queryOptions())
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

function applyCreateOptimistic(
  current: Credential[] | undefined,
  input: {
    name: string
    username: string
    privateKey: string
    publicKey: string
  }
) {
  if (!current) return current
  const optimistic = {
    id: `optimistic-${Date.now()}`,
    name: input.name,
    username: input.username,
    privateKey: input.privateKey,
    publicKey: input.publicKey,
  } as unknown as Credential
  return [...current, optimistic]
}

function applyUpdateOptimistic(
  current: Credential[] | undefined,
  input: {
    id: string
    name: string
    username: string
    privateKey: string
    publicKey: string
  }
) {
  if (!current) return current
  return current.map((credential) =>
    String(credential.id) === String(input.id)
      ? {
          ...credential,
          name: input.name,
          username: input.username,
          privateKey: input.privateKey,
          publicKey: input.publicKey,
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
  return useResourceMutation<
    { name: string; username: string; privateKey: string; publicKey: string },
    Credential,
    Credential[]
  >({
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
      privateKey: string
      publicKey: string
    },
    Credential,
    Credential[]
  >({
    mutationFn: (input) =>
      orpc.credentials.update.call(input) as Promise<Credential>,
    listKey,
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
    applyOptimistic: applyDeleteOptimistic,
    messages: { success: t("toast.deleted"), error: t("toast.delete_error") },
  })
}
