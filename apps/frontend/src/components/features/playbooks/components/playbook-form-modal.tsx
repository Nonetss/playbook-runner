"use client"

import {
  usePlaybookCreate,
  usePlaybookUpdate,
} from "@/components/features/playbooks/hooks/usePlaybooks"
import type { Playbook } from "@/components/features/playbooks/types"
import { ResourceFormModal } from "@/components/shared/resource-form-modal"
import type { ResourceFormDefinition } from "@/components/shared/resource-form-types"

export type PlaybookFormValues = {
  name: string
  description?: string
  content: string
}

const emptyValues: PlaybookFormValues = {
  name: "",
  description: "",
  content: "",
}

const definition: ResourceFormDefinition<PlaybookFormValues> = {
  fields: [
    {
      name: "name",
      label: "Nombre",
      placeholder: "deploy-web",
      required: true,
    },
    {
      name: "description",
      label: "Descripción",
      placeholder: "Despliega la aplicación web en producción",
    },
    {
      name: "content",
      label: "Contenido",
      placeholder: `---
- name: Deploy web
  hosts: webservers
  tasks:
    - name: Install nginx
      apt:
        name: nginx
        state: present`,
      required: true,
      type: "textarea",
      rows: 12,
    },
  ],
  defaultValues: emptyValues,
  valuesFromEntity: (entity) => {
    const playbook = entity as Playbook
    return {
      name: playbook.name,
      description: playbook.description ?? "",
      content: playbook.content,
    }
  },
}

export type PlaybookFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  playbook?: Playbook | null
}

export function PlaybookFormModal({
  open,
  onOpenChange,
  playbook = null,
}: PlaybookFormModalProps) {
  const isEditing = !!playbook
  const createPlaybook = usePlaybookCreate()
  const updatePlaybook = usePlaybookUpdate()
  const mutation = isEditing ? updatePlaybook : createPlaybook

  return (
    <ResourceFormModal<PlaybookFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Editar playbook" : "Nuevo playbook"}
      description={
        isEditing
          ? "Actualiza los datos del playbook."
          : "Define un nuevo playbook para tus automatizaciones."
      }
      isEditing={isEditing}
      definition={definition}
      entity={playbook}
      isSubmitting={mutation.isPending}
      submitLabel="Crear playbook"
      editingSubmitLabel="Guardar cambios"
      formId="playbook-form"
      onSubmit={async (values) => {
        const payload = {
          name: values.name,
          description: values.description || undefined,
          content: values.content,
        }
        if (isEditing && playbook) {
          await updatePlaybook.mutateAsync({ id: playbook.id, ...payload })
        } else {
          await createPlaybook.mutateAsync(payload)
        }
      }}
    />
  )
}
