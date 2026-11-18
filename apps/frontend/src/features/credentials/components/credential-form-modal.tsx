import * as React from "react"
import { useTranslation } from "react-i18next"
import { dataFieldClass, Text } from "@/components/shared/brand/typography"
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
import type {
  Credential,
  CredentialScope,
  CredentialType,
} from "@/features/credentials/types"
import { cn } from "@/lib/utils"

/** What Git hosts accept as the username of an access token. */
const DEFAULT_TOKEN_USERNAME = "x-access-token"

export type CredentialFormValues = {
  type: CredentialType
  name: string
  username: string
  privateKey: string
  publicKey: string
  token: string
}

const emptyValues: CredentialFormValues = {
  type: "ssh_key",
  name: "",
  username: "",
  privateKey: "",
  publicKey: "",
  token: "",
}

function valuesFromEntity(credential: Credential): CredentialFormValues {
  return {
    type: credential.type,
    name: credential.name,
    username: credential.username,
    // The API never returns the private key or the token; empty means "keep
    // current".
    privateKey: "",
    publicKey: credential.publicKey ?? "",
    token: "",
  }
}

type KeyMode = "import" | "generate"

export type CredentialFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  credential?: Credential | null
  /** What the new credential is for; an edited one keeps its own. */
  scope: CredentialScope
}

export function CredentialFormModal({
  open,
  onOpenChange,
  credential = null,
  scope,
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

  function switchType(next: CredentialType) {
    if (next === values.type) return
    setMode("import")
    setValues({ ...emptyValues, type: next, name: values.name })
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
        const { name, username } = values
        await updateCredential.mutateAsync({
          id: credential.id,
          name,
          username,
          ...(credential.type === "token"
            ? values.token.trim()
              ? { token: values.token }
              : {}
            : {
                publicKey: values.publicKey,
                ...(values.privateKey.trim()
                  ? { privateKey: values.privateKey }
                  : {}),
              }),
        })
      } else if (values.type === "token") {
        await createCredential.mutateAsync({
          type: "token",
          scope: "git",
          name: values.name,
          username: values.username.trim() || DEFAULT_TOKEN_USERNAME,
          token: values.token,
        })
      } else {
        await createCredential.mutateAsync({
          type: "ssh_key",
          scope,
          name: values.name,
          username: values.username,
          privateKey: values.privateKey,
          publicKey: values.publicKey,
        })
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

  const isToken = values.type === "token"
  const showGeneratedKeys = mode === "generate" && !!values.privateKey

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={isEditing ? t("form.edit_title") : t("form.create_title")}
      description={
        isEditing
          ? t("form.edit_description")
          : t(`form.create_description_${scope}`)
      }
      formId="credential-form"
      onSubmit={handleSubmit}
      isPending={isSubmitting}
      submitDisabled={
        !isToken && mode === "generate" && !values.privateKey && !isEditing
      }
      submitLabel={
        isSubmitting
          ? t("form.saving")
          : isEditing
            ? t("form.save_changes")
            : t("form.create")
      }
      cancelLabel={t("form.cancel")}
    >
      {!isEditing && scope === "git" ? (
        <Tabs
          value={values.type}
          onValueChange={(next) => switchType(next as CredentialType)}
        >
          <TabsList className="w-full">
            <TabsTrigger value="ssh_key" disabled={isSubmitting}>
              {t("form.type_ssh_key")}
            </TabsTrigger>
            <TabsTrigger value="token" disabled={isSubmitting}>
              {t("form.type_token")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}

      {!isEditing && !isToken && scope === "host" ? (
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
        required={!isToken}
        hint={isToken ? t("form.token_username_hint") : undefined}
      >
        <Input
          id="username-field"
          required={!isToken}
          disabled={isSubmitting}
          placeholder={isToken ? DEFAULT_TOKEN_USERNAME : "deploy"}
          value={values.username}
          onChange={(e) => updateField("username", e.target.value)}
          className="font-mono"
        />
      </FormField>

      {isToken ? (
        <FormField
          label={t("form.token_label")}
          htmlFor="token-field"
          required={!isEditing}
          hint={
            isEditing ? (
              <span id="token-keep-hint">{t("form.token_keep_hint")}</span>
            ) : (
              t("form.token_hint")
            )
          }
        >
          <Input
            id="token-field"
            type="password"
            autoComplete="off"
            required={!isEditing}
            aria-describedby={isEditing ? "token-keep-hint" : undefined}
            disabled={isSubmitting}
            placeholder="ghp_…"
            value={values.token}
            onChange={(e) => updateField("token", e.target.value)}
            className="font-mono"
          />
        </FormField>
      ) : mode === "import" || isEditing ? (
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
              className={dataFieldClass}
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
              className={dataFieldClass}
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
                className={cn(dataFieldClass, "text-muted-foreground")}
              />
            </FormField>
          ) : null}
        </div>
      )}

      {error ? <InlineAlert>{error}</InlineAlert> : null}
    </FormDialog>
  )
}
