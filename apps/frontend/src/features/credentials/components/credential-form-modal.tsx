import * as React from "react"
import { useTranslation } from "react-i18next"
import { Text } from "@/components/shared/brand/typography"
import { InlineAlert } from "@/components/shared/feedback/inline-alert"
import { FormField } from "@/components/shared/form/field-label"
import { FormDialog } from "@/components/shared/form/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  useCredentialCreate,
  useCredentialGenerate,
  useCredentialUpdate,
} from "@/features/credentials/hooks/use-credentials"
import type { Credential } from "@/features/credentials/types"

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

function valuesFromEntity(credential: Credential): CredentialFormValues {
  return {
    name: credential.name,
    username: credential.username,
    // The API never returns the private key; empty means "keep current".
    privateKey: "",
    publicKey: credential.publicKey,
  }
}

type KeyMode = "import" | "generate"

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
  const { t } = useTranslation("credentials")
  const isEditing = !!credential
  const createCredential = useCredentialCreate()
  const updateCredential = useCredentialUpdate()
  const generateKeyPair = useCredentialGenerate()
  const mutation = isEditing ? updateCredential : createCredential
  const isSubmitting = mutation.isPending

  const [mode, setMode] = React.useState<KeyMode>("import")
  const [values, setValues] = React.useState<CredentialFormValues>(emptyValues)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      setValues(emptyValues)
      setMode("import")
      setError(null)
      return
    }
    setValues(credential ? valuesFromEntity(credential) : emptyValues)
  }, [open, credential])

  function updateField<K extends keyof CredentialFormValues>(
    key: K,
    value: CredentialFormValues[K]
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function switchMode(next: KeyMode) {
    if (next === mode) return
    setMode(next)
    setValues((current) => ({ ...current, privateKey: "", publicKey: "" }))
  }

  async function handleGenerate() {
    setError(null)
    try {
      const generated = await generateKeyPair.mutateAsync({
        comment: values.username.trim() || values.name.trim() || undefined,
      })
      setValues((current) => ({
        ...current,
        privateKey: generated.privateKey,
        publicKey: generated.publicKey,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.generate_error"))
    }
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError(null)
    try {
      if (isEditing && credential) {
        const { privateKey, ...rest } = values
        await updateCredential.mutateAsync({
          id: credential.id,
          ...rest,
          ...(privateKey.trim() ? { privateKey } : {}),
        })
      } else {
        await createCredential.mutateAsync(values)
      }
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.save_error"))
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (isSubmitting) return
    onOpenChange(next)
  }

  const showGeneratedKeys = mode === "generate" && !!values.privateKey

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={isEditing ? t("form.edit_title") : t("form.create_title")}
      description={
        isEditing ? t("form.edit_description") : t("form.create_description")
      }
      formId="credential-form"
      onSubmit={handleSubmit}
      isPending={isSubmitting}
      submitDisabled={mode === "generate" && !values.privateKey && !isEditing}
      submitLabel={
        isSubmitting
          ? t("form.saving")
          : isEditing
            ? t("form.save_changes")
            : t("form.create")
      }
      cancelLabel={t("form.cancel")}
    >
      {!isEditing ? (
        <Tabs
          value={mode}
          onValueChange={(next) => switchMode(next as KeyMode)}
        >
          <TabsList className="w-full">
            <TabsTrigger value="import" disabled={isSubmitting}>
              {t("form.import_existing")}
            </TabsTrigger>
            <TabsTrigger value="generate" disabled={isSubmitting}>
              {t("form.generate_new")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}

      <FormField label={t("form.name_label")} htmlFor="name-field" required>
        <Input
          id="name-field"
          required
          disabled={isSubmitting}
          placeholder="prod-server"
          value={values.name}
          onChange={(e) => updateField("name", e.target.value)}
        />
      </FormField>

      <FormField
        label={t("form.username_label")}
        htmlFor="username-field"
        required
      >
        <Input
          id="username-field"
          required
          disabled={isSubmitting}
          placeholder="deploy"
          value={values.username}
          onChange={(e) => updateField("username", e.target.value)}
          className="font-mono"
        />
      </FormField>

      {mode === "import" || isEditing ? (
        <>
          <FormField
            label={t("form.private_key_label")}
            htmlFor="privateKey-field"
            required={!isEditing}
            hint={
              isEditing ? (
                <span id="privateKey-keep-hint">
                  {t("form.private_key_keep_hint")}
                </span>
              ) : undefined
            }
          >
            <Textarea
              id="privateKey-field"
              required={!isEditing}
              aria-describedby={isEditing ? "privateKey-keep-hint" : undefined}
              disabled={isSubmitting}
              placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
              value={values.privateKey}
              rows={5}
              onChange={(e) => updateField("privateKey", e.target.value)}
              className="font-mono text-xs"
            />
          </FormField>
          <FormField
            label={t("form.public_key_label")}
            htmlFor="publicKey-field"
            required
          >
            <Textarea
              id="publicKey-field"
              required
              disabled={isSubmitting}
              placeholder="ssh-ed25519 AAAA..."
              value={values.publicKey}
              rows={3}
              onChange={(e) => updateField("publicKey", e.target.value)}
              className="font-mono text-xs"
            />
          </FormField>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Text as="p" variant="meta" tone="muted">
              {showGeneratedKeys
                ? t("form.generate_success")
                : t("form.generate_hint")}
            </Text>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isSubmitting || generateKeyPair.isPending}
              onClick={handleGenerate}
            >
              {generateKeyPair.isPending
                ? t("form.generating")
                : showGeneratedKeys
                  ? t("form.regenerate")
                  : t("form.generate")}
            </Button>
          </div>

          {showGeneratedKeys ? (
            <FormField
              label={t("form.public_key_label")}
              htmlFor="generated-public-key"
            >
              <Textarea
                id="generated-public-key"
                readOnly
                value={values.publicKey}
                rows={3}
                className="font-mono text-xs text-muted-foreground"
              />
            </FormField>
          ) : null}
        </div>
      )}

      {error ? <InlineAlert>{error}</InlineAlert> : null}
    </FormDialog>
  )
}
