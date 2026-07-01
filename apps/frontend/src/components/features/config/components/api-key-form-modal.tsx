import { useTranslation } from "react-i18next"
import { useApiKeyCreate } from "@/components/features/config/hooks/useApiKeys"
import { ResourceFormModal } from "@/components/shared/resource-form-modal"
import type { ResourceFormDefinition } from "@/components/shared/resource-form-types"

export type ApiKeyFormValues = {
  name: string
  expiresIn: string
}

const emptyValues: ApiKeyFormValues = {
  name: "",
  expiresIn: "30",
}

export type ApiKeyFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Called once the create mutation resolves with the freshly generated key.
   * The page uses this to open the "API key created" dialog with the full
   * value, since it will not be retrievable again.
   */
  onCreated?: (fullKey: string) => void
}

export function ApiKeyFormModal({
  open,
  onOpenChange,
  onCreated,
}: ApiKeyFormModalProps) {
  const { t } = useTranslation("config")
  const createApiKey = useApiKeyCreate()

  type Days = 30 | 90 | 180 | 365

  function daysLabel(days: Days): string {
    const unit = t("api_keys.create.expiry_options.days_unit", { count: days })
    return `${days} ${unit}`
  }

  const EXPIRATION_OPTIONS: { value: string; label: string }[] = [
    { value: "30", label: daysLabel(30) },
    { value: "90", label: daysLabel(90) },
    { value: "180", label: daysLabel(180) },
    { value: "365", label: daysLabel(365) },
    {
      value: "never",
      label: t("api_keys.create.expiry_options.never"),
    },
  ]

  const definition: ResourceFormDefinition<ApiKeyFormValues> = {
    fields: [
      {
        name: "name",
        label: t("api_keys.create.name_label"),
        placeholder: t("api_keys.create.name_placeholder"),
        required: false,
      },
      {
        name: "expiresIn",
        label: t("api_keys.create.expiry_label"),
        placeholder: t("api_keys.create.expiry_placeholder"),
        required: true,
        type: "select",
        options: EXPIRATION_OPTIONS,
      },
    ],
    defaultValues: emptyValues,
    valuesFromEntity: () => emptyValues,
  }

  return (
    <ResourceFormModal<ApiKeyFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={t("api_keys.create.title")}
      description={t("api_keys.create.subtitle")}
      isEditing={false}
      definition={definition}
      isSubmitting={createApiKey.isPending}
      submitLabel={t("api_keys.create.submit")}
      formId="api-key-form"
      onSubmit={async (values) => {
        const days = Number.parseInt(values.expiresIn, 10)
        const expiresIn =
          values.expiresIn === "never" || !Number.isFinite(days)
            ? undefined
            : days * 24 * 60 * 60
        const created = await createApiKey.mutateAsync({
          name: values.name.trim() || undefined,
          expiresIn,
        })
        if (created?.key && onCreated) {
          onCreated(created.key)
        }
      }}
    />
  )
}
