import { useTranslation } from "react-i18next"
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
  const { t } = useTranslation("inventory")
  const isEditing = !!group
  const createGroup = useGroupCreate()
  const updateGroup = useGroupUpdate()
  const mutation = isEditing ? updateGroup : createGroup

  const definition: ResourceFormDefinition<GroupFormValues> = {
    fields: [
      {
        name: "name",
        label: t("group_form.name_label"),
        placeholder: t("group_form.name_placeholder"),
        required: true,
      },
      {
        name: "description",
        label: t("group_form.description_label"),
        placeholder: t("group_form.description_placeholder"),
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

  return (
    <ResourceFormModal<GroupFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={
        isEditing ? t("group_form.edit_title") : t("group_form.create_title")
      }
      description={
        isEditing
          ? t("group_form.edit_subtitle")
          : t("group_form.create_subtitle")
      }
      isEditing={isEditing}
      definition={definition}
      entity={group}
      isSubmitting={mutation.isPending}
      submitLabel={t("group_form.create")}
      editingSubmitLabel={t("group_form.save_changes")}
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
