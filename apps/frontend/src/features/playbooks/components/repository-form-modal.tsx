import { useTranslation } from "react-i18next"
import { ResourceFormModal } from "@/components/shared/resource-form-modal"
import type { ResourceFormDefinition } from "@/components/shared/resource-form-types"
import { useCredentialsList } from "@/features/credentials/hooks/use-credentials"
import {
  useRepositoryCreate,
  useRepositoryUpdate,
} from "@/features/playbooks/hooks/use-repositories"
import type { PlaybookRepository } from "@/features/playbooks/types"

type RepositoryFormValues = {
  name: string
  url: string
  branch: string
  subdir: string
  credentialId: string
}

type RepositoryFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  repository?: PlaybookRepository | null
  /** Called with a newly created repository (e.g. to run its first sync). */
  onCreated?: (repository: PlaybookRepository) => void
}

const emptyValues: RepositoryFormValues = {
  name: "",
  url: "",
  branch: "main",
  subdir: "",
  credentialId: "",
}

export function RepositoryFormModal({
  open,
  onOpenChange,
  repository = null,
  onCreated,
}: RepositoryFormModalProps) {
  const { t } = useTranslation("playbooks")
  const { data: credentials = [] } = useCredentialsList()
  const createRepository = useRepositoryCreate()
  const updateRepository = useRepositoryUpdate()
  const isEditing = !!repository
  const mutation = isEditing ? updateRepository : createRepository

  const definition: ResourceFormDefinition<RepositoryFormValues> = {
    fields: [
      {
        name: "name",
        label: t("repository.name_label"),
        placeholder: t("repository.name_placeholder"),
        required: true,
      },
      {
        name: "url",
        label: t("repository.url_label"),
        placeholder: t("repository.url_placeholder"),
        required: true,
        inputClassName: "font-mono",
      },
      {
        name: "branch",
        label: t("repository.branch_label"),
        placeholder: "main",
        required: true,
        inputClassName: "font-mono",
      },
      {
        name: "subdir",
        label: t("repository.subdir_label"),
        placeholder: t("repository.subdir_placeholder"),
        inputClassName: "font-mono",
      },
      {
        name: "credentialId",
        label: t("repository.credential_label"),
        type: "select",
        // The shared select renders `placeholder` as the selectable empty
        // choice ("" in the form values = no credential).
        placeholder: t("repository.credential_none"),
        options: credentials.map((credential) => ({
          value: credential.id,
          label: credential.name,
        })),
      },
    ],
    defaultValues: emptyValues,
    valuesFromEntity: (entity) => {
      const current = entity as PlaybookRepository
      return {
        name: current.name,
        url: current.url,
        branch: current.branch,
        subdir: current.subdir ?? "",
        credentialId: current.credentialId ?? "",
      }
    },
  }

  return (
    <ResourceFormModal<RepositoryFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={
        isEditing ? t("repository.edit_title") : t("repository.create_title")
      }
      description={t("repository.form_subtitle")}
      isEditing={isEditing}
      definition={definition}
      entity={repository}
      isSubmitting={mutation.isPending}
      submitLabel={t("repository.create")}
      editingSubmitLabel={t("repository.save")}
      formId="playbook-repository-form"
      onSubmit={async (values) => {
        const payload = {
          name: values.name,
          url: values.url,
          branch: values.branch || "main",
          subdir: values.subdir || null,
          credentialId: values.credentialId || null,
        }
        if (repository) {
          await updateRepository.mutateAsync({ id: repository.id, ...payload })
        } else {
          const created = await createRepository.mutateAsync(payload)
          onCreated?.(created)
        }
      }}
    />
  )
}
