import * as React from "react"
import { useTranslation } from "react-i18next"
import { InlineAlert } from "@/components/shared/feedback/inline-alert"
import { FormField } from "@/components/shared/form/field-label"
import { FormDialog } from "@/components/shared/form/form-dialog"
import { Input } from "@/components/ui/input"
import {
  useInfisicalConnectionCreate,
  useInfisicalConnectionUpdate,
} from "@/features/infisical/hooks/use-infisical-connections"
import type { InfisicalConnection } from "@/features/infisical/types"

type FormValues = {
  name: string
  url: string
  clientId: string
  clientSecret: string
  projectId: string
}

const emptyValues: FormValues = {
  name: "",
  url: "https://app.infisical.com",
  clientId: "",
  clientSecret: "",
  projectId: "",
}

function valuesFromEntity(connection: InfisicalConnection): FormValues {
  return {
    name: connection.name,
    url: connection.url,
    clientId: connection.clientId,
    // The API never returns the secret; empty means "keep current".
    clientSecret: "",
    projectId: connection.projectId ?? "",
  }
}

export function InfisicalConnectionFormModal({
  open,
  onOpenChange,
  connection = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  connection?: InfisicalConnection | null
}) {
  const { t } = useTranslation("infisical")
  const isEditing = !!connection
  const createConnection = useInfisicalConnectionCreate()
  const updateConnection = useInfisicalConnectionUpdate()
  const isSubmitting = isEditing
    ? updateConnection.isPending
    : createConnection.isPending

  const [values, setValues] = React.useState<FormValues>(emptyValues)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      setValues(emptyValues)
      setError(null)
      return
    }
    setValues(connection ? valuesFromEntity(connection) : emptyValues)
  }, [open, connection])

  function updateField<K extends keyof FormValues>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError(null)
    try {
      if (connection) {
        const { clientSecret, ...rest } = values
        await updateConnection.mutateAsync({
          id: connection.id,
          ...rest,
          ...(clientSecret ? { clientSecret } : {}),
        })
      } else {
        await createConnection.mutateAsync(values)
      }
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.save_error"))
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!isSubmitting) onOpenChange(next)
      }}
      title={isEditing ? t("form.edit_title") : t("form.create_title")}
      description={t("form.description")}
      formId="infisical-connection-form"
      onSubmit={handleSubmit}
      isPending={isSubmitting}
      submitLabel={
        isSubmitting
          ? t("form.saving")
          : isEditing
            ? t("form.save_changes")
            : t("form.create")
      }
      cancelLabel={t("form.cancel")}
    >
      <FormField label={t("form.name_label")} htmlFor="infisical-name" required>
        <Input
          id="infisical-name"
          required
          disabled={isSubmitting}
          placeholder="production"
          value={values.name}
          onChange={(e) => updateField("name", e.target.value)}
        />
      </FormField>

      <FormField label={t("form.url_label")} htmlFor="infisical-url" required>
        <Input
          id="infisical-url"
          type="url"
          required
          disabled={isSubmitting}
          value={values.url}
          onChange={(e) => updateField("url", e.target.value)}
          className="font-mono"
        />
      </FormField>

      <FormField
        label={t("form.project_id_label")}
        htmlFor="infisical-project-id"
        hint={t("form.project_id_hint")}
        required
      >
        <Input
          id="infisical-project-id"
          required
          autoComplete="off"
          disabled={isSubmitting}
          value={values.projectId}
          onChange={(e) => updateField("projectId", e.target.value)}
          className="font-mono"
        />
      </FormField>

      <FormField
        label={t("form.client_id_label")}
        htmlFor="infisical-client-id"
        required
      >
        <Input
          id="infisical-client-id"
          required
          autoComplete="off"
          disabled={isSubmitting}
          value={values.clientId}
          onChange={(e) => updateField("clientId", e.target.value)}
          className="font-mono"
        />
      </FormField>

      <FormField
        label={t("form.client_secret_label")}
        htmlFor="infisical-client-secret"
        required={!isEditing}
        hint={isEditing ? t("form.client_secret_keep_hint") : undefined}
      >
        <Input
          id="infisical-client-secret"
          type="password"
          required={!isEditing}
          autoComplete="new-password"
          disabled={isSubmitting}
          value={values.clientSecret}
          onChange={(e) => updateField("clientSecret", e.target.value)}
          className="font-mono"
        />
      </FormField>

      {error ? <InlineAlert>{error}</InlineAlert> : null}
    </FormDialog>
  )
}
