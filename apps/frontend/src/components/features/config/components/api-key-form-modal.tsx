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

const EXPIRATION_OPTIONS = [
  { value: "30", label: "30 días" },
  { value: "90", label: "90 días" },
  { value: "180", label: "180 días" },
  { value: "365", label: "1 año" },
  { value: "never", label: "Sin caducidad" },
] as const

const definition: ResourceFormDefinition<ApiKeyFormValues> = {
  fields: [
    {
      name: "name",
      label: "Nombre",
      placeholder: "CI pipeline",
      required: false,
    },
    {
      name: "expiresIn",
      label: "Caducidad",
      placeholder: "Selecciona una caducidad",
      required: true,
      type: "select",
      options: EXPIRATION_OPTIONS,
    },
  ],
  defaultValues: emptyValues,
  valuesFromEntity: () => emptyValues,
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
  const createApiKey = useApiKeyCreate()

  return (
    <ResourceFormModal<ApiKeyFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Nueva API key"
      description="Genera una nueva clave de acceso para los endpoints de la API."
      isEditing={false}
      definition={definition}
      isSubmitting={createApiKey.isPending}
      submitLabel="Crear API key"
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
