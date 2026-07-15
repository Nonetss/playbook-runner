import { useTranslation } from "react-i18next"
import {
  usePlaybookFolderCreate,
  usePlaybookFolderUpdate,
} from "@/components/features/playbooks/hooks/usePlaybookFolders"
import type { PlaybookFolder } from "@/components/features/playbooks/types"
import { ResourceFormModal } from "@/components/shared/resource-form-modal"
import type { ResourceFormDefinition } from "@/components/shared/resource-form-types"

type FolderFormValues = {
  name: string
  description?: string
}

type PlaybookFolderFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  folder?: PlaybookFolder | null
}

const emptyValues: FolderFormValues = {
  name: "",
  description: "",
}

export function PlaybookFolderFormModal({
  open,
  onOpenChange,
  folder = null,
}: PlaybookFolderFormModalProps) {
  const { t } = useTranslation("playbooks")
  const createFolder = usePlaybookFolderCreate()
  const updateFolder = usePlaybookFolderUpdate()
  const isEditing = !!folder
  const mutation = isEditing ? updateFolder : createFolder

  const definition: ResourceFormDefinition<FolderFormValues> = {
    fields: [
      {
        name: "name",
        label: t("folder.name_label"),
        placeholder: t("folder.name_placeholder"),
        required: true,
      },
      {
        name: "description",
        label: t("folder.description_label"),
        placeholder: t("folder.description_placeholder"),
      },
    ],
    defaultValues: emptyValues,
    valuesFromEntity: (entity) => {
      const currentFolder = entity as PlaybookFolder
      return {
        name: currentFolder.name,
        description: currentFolder.description ?? "",
      }
    },
  }

  return (
    <ResourceFormModal<FolderFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? t("folder.edit_title") : t("folder.create_title")}
      description={
        isEditing ? t("folder.edit_subtitle") : t("folder.create_subtitle")
      }
      isEditing={isEditing}
      definition={definition}
      entity={folder}
      isSubmitting={mutation.isPending}
      submitLabel={t("folder.create")}
      editingSubmitLabel={t("folder.save")}
      formId="playbook-folder-form"
      onSubmit={async (values) => {
        const payload = {
          name: values.name,
          description: values.description || undefined,
        }
        if (folder) {
          await updateFolder.mutateAsync({ id: folder.id, ...payload })
        } else {
          await createFolder.mutateAsync(payload)
        }
      }}
    />
  )
}
