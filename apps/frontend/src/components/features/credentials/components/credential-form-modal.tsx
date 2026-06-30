"use client"

import {
  useCredentialCreate,
  useCredentialUpdate,
} from "@/components/features/credentials/hooks/useCredentials"
import type { Credential } from "@/components/features/credentials/types"
import { ResourceFormModal } from "@/components/shared/resource-form-modal"
import type { ResourceFormDefinition } from "@/components/shared/resource-form-types"

export type CredentialFormValues = {
  name: string
  username: string
  privateKey: string
  publicKey: string
}

const emptyValues: CredentialFormValues = {
  name: "",
  username: "",
  privateKey: "",
  publicKey: "",
}

const definition: ResourceFormDefinition<CredentialFormValues> = {
  fields: [
    {
      name: "name",
      label: "Nombre",
      placeholder: "prod-server",
      required: true,
    },
    {
      name: "username",
      label: "Usuario",
      placeholder: "deploy",
      required: true,
    },
    {
      name: "privateKey",
      label: "Clave privada",
      placeholder: "-----BEGIN OPENSSH PRIVATE KEY-----",
      required: true,
      type: "textarea",
      rows: 5,
    },
    {
      name: "publicKey",
      label: "Clave pública",
      placeholder: "ssh-ed25519 AAAA...",
      required: true,
      type: "textarea",
      rows: 3,
    },
  ],
  defaultValues: emptyValues,
  valuesFromEntity: (entity) => {
    const credential = entity as Credential
    return {
      name: credential.name,
      username: credential.username,
      privateKey: credential.privateKey,
      publicKey: credential.publicKey,
    }
  },
}

export type CredentialFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  credential?: Credential | null
}

export function CredentialFormModal({
  open,
  onOpenChange,
  credential = null,
}: CredentialFormModalProps) {
  const isEditing = !!credential
  const createCredential = useCredentialCreate()
  const updateCredential = useCredentialUpdate()
  const mutation = isEditing ? updateCredential : createCredential

  return (
    <ResourceFormModal<CredentialFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Editar credencial" : "Nueva credencial"}
      description={
        isEditing
          ? "Actualiza los datos de acceso SSH."
          : "Añade una credencial SSH para tus despliegues."
      }
      isEditing={isEditing}
      definition={definition}
      entity={credential}
      isSubmitting={mutation.isPending}
      submitLabel="Crear credencial"
      editingSubmitLabel="Guardar cambios"
      formId="credential-form"
      onSubmit={async (values) => {
        if (isEditing && credential) {
          await updateCredential.mutateAsync({ id: credential.id, ...values })
        } else {
          await createCredential.mutateAsync(values)
        }
      }}
    />
  )
}
