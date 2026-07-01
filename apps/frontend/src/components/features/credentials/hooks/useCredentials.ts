import { useMutation } from "@tanstack/react-query"
import type { Credential } from "@/components/features/credentials/types"
import { useHydratedQuery } from "@/hooks/useHydratedQuery"
import { useResourceMutation } from "@/hooks/useResourceMutation"
import { orpc } from "@/lib/orpc"

export const useCredentialsList = () => {
  return useHydratedQuery(orpc.credentials.list.queryOptions())
}

export const useCredentialGet = (
  id: number,
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
    id: -Date.now(),
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
    id: number
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
  input: { id: number }
) {
  if (!current) return current
  return current.filter(
    (credential) => String(credential.id) !== String(input.id)
  )
}

export const useCredentialCreate = () =>
  useResourceMutation<
    { name: string; username: string; privateKey: string; publicKey: string },
    Credential,
    Credential[]
  >({
    mutationFn: (input) =>
      orpc.credentials.create.call(input) as Promise<Credential>,
    listKey,
    applyOptimistic: applyCreateOptimistic,
    messages: {
      success: "Credencial creada",
      error: "No se pudo crear la credencial",
    },
  })

export const useCredentialUpdate = () =>
  useResourceMutation<
    {
      id: number
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
    messages: {
      success: "Credencial actualizada",
      error: "No se pudo actualizar la credencial",
    },
  })

export const useCredentialGenerate = () =>
  useMutation(orpc.credentials.generate.mutationOptions())

export const useCredentialDelete = () =>
  useResourceMutation<{ id: number }, Credential, Credential[]>({
    mutationFn: (input) =>
      orpc.credentials.delete.call(input) as Promise<Credential>,
    listKey,
    applyOptimistic: applyDeleteOptimistic,
    messages: {
      success: "Credencial eliminada",
      error: "No se pudo eliminar la credencial",
    },
  })
