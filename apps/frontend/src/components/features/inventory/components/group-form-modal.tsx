import {
  useGroupCreate,
  useGroupUpdate,
} from "@/components/features/inventory/hooks/useGroups"
import type { InventoryGroup } from "@/components/features/inventory/types"
import { ResourceFormModal } from "@/components/shared/resource-form-modal"
import type { ResourceFormDefinition } from "@/components/shared/resource-form-types"

export type GroupFormValues = {
  name: string
  description?: string
}

const emptyValues: GroupFormValues = {
  name: "",
  description: "",
}

const definition: ResourceFormDefinition<GroupFormValues> = {
  fields: [
    {
      name: "name",
      label: "Nombre",
      placeholder: "webservers",
      required: true,
    },
    {
      name: "description",
      label: "Descripción",
      placeholder: "Servidores web de producción",
    },
  ],
  defaultValues: emptyValues,
  valuesFromEntity: (entity) => {
    const group = entity as InventoryGroup
    return {
      name: group.name,
      description: group.description ?? "",
    }
  },
}

export type GroupFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  group?: InventoryGroup | null
}

export function GroupFormModal({
  open,
  onOpenChange,
  group = null,
}: GroupFormModalProps) {
  const isEditing = !!group
  const createGroup = useGroupCreate()
  const updateGroup = useGroupUpdate()
  const mutation = isEditing ? updateGroup : createGroup

  return (
    <ResourceFormModal<GroupFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Editar grupo" : "Nuevo grupo"}
      description={
        isEditing
          ? "Actualiza los datos del grupo de inventario."
          : "Crea un grupo para organizar tus dispositivos."
      }
      isEditing={isEditing}
      definition={definition}
      entity={group}
      isSubmitting={mutation.isPending}
      submitLabel="Crear grupo"
      editingSubmitLabel="Guardar cambios"
      formId="group-form"
      onSubmit={async (values) => {
        const payload = {
          name: values.name,
          description: values.description || undefined,
        }
        if (isEditing && group) {
          await updateGroup.mutateAsync({ id: group.id, ...payload })
        } else {
          await createGroup.mutateAsync(payload)
        }
      }}
    />
  )
}
