import { getIcon } from "@/lib/icon-registry"

const TerminalSquare = getIcon("resources", "terminalSquare")

import * as React from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { Text } from "@/components/shared/brand/typography"
import { CodeEditor } from "@/components/shared/code-editor"
import { InlineAlert } from "@/components/shared/feedback/inline-alert"
import { StateCard } from "@/components/shared/feedback/state-card"
import { FieldLabel, FormField } from "@/components/shared/form/field-label"
import { SegmentedPicker } from "@/components/shared/form/segmented-picker"
import { DetailFrame } from "@/components/shared/layout/detail-frame"
import { PageHero } from "@/components/shared/layout/page-hero"
import { AppLink } from "@/components/ui/app-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  useScriptCreate,
  useScriptGet,
  useScriptUpdate,
} from "@/features/scripts/hooks/use-scripts"
import { navigate } from "@/lib/navigate"

type ScriptLanguage = "bash" | "python"

type FormValues = {
  name: string
  description: string
  content: string
  language: ScriptLanguage
}

const EMPTY_VALUES: FormValues = {
  name: "",
  description: "",
  content: "",
  language: "bash",
}

export type ScriptFormPageProps = {
  /** When present the page edits an existing script; otherwise it creates one. */
  id?: string
}

function ScriptFormPageInner({ id }: ScriptFormPageProps) {
  const { t } = useTranslation("scripts")
  const isEditing = !!id
  const createScript = useScriptCreate()
  const updateScript = useScriptUpdate()
  const {
    data: script,
    isPending: isLoading,
    isError: isLoadError,
  } = useScriptGet(id ?? "", { enabled: isEditing })

  const [values, setValues] = React.useState<FormValues>(EMPTY_VALUES)
  const [error, setError] = React.useState<string | null>(null)
  const [touched, setTouched] = React.useState(false)

  React.useEffect(() => {
    if (isEditing && script) {
      setValues({
        name: script.name,
        description: script.description ?? "",
        content: script.content,
        language: script.language ?? "bash",
      })
    }
  }, [isEditing, script])

  const isSubmitting = createScript.isPending || updateScript.isPending

  const trimmedName = values.name.trim()
  const trimmedContent = values.content.trim()
  const nameMissing = touched && trimmedName.length === 0
  const contentMissing = touched && trimmedContent.length === 0

  function updateField<K extends keyof FormValues>(
    key: K,
    value: FormValues[K]
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setTouched(true)
    if (trimmedName.length === 0 || trimmedContent.length === 0) return
    setError(null)
    const payload = {
      name: trimmedName,
      description: values.description || undefined,
      content: values.content,
      language: values.language,
    }
    try {
      if (isEditing && id) {
        await updateScript.mutateAsync({ id, ...payload })
      } else {
        await createScript.mutateAsync(payload)
      }
      navigate("/scripts")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.save_error"))
    }
  }

  const title = isEditing ? t("form.edit_title") : t("form.create_title")
  const frame = (children: React.ReactNode) => (
    <DetailFrame
      backHref="/scripts"
      backLabel={t("form.back_to_scripts")}
      maxWidth="full"
    >
      {children}
    </DetailFrame>
  )

  if (isEditing && isLoading) {
    return frame(<StateCard spinner title={t("form.loading")} />)
  }

  if (isEditing && (isLoadError || !script)) {
    return frame(<StateCard tone="destructive" title={t("form.load_error")} />)
  }

  return frame(
    <>
      <PageHero
        surface="scripts"
        title={title}
        description={
          isEditing ? t("form.edit_subtitle") : t("form.create_subtitle")
        }
      />

      <form
        onSubmit={handleSubmit}
        className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-5 split:overflow-hidden"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <FormField
            label={t("form.name_label")}
            htmlFor="name-field"
            required
            error={nameMissing ? t("form.name_required") : undefined}
          >
            <Input
              id="name-field"
              required
              disabled={isSubmitting}
              placeholder={t("form.name_placeholder")}
              value={values.name}
              onBlur={() => setTouched(true)}
              onChange={(e) => updateField("name", e.target.value)}
              aria-invalid={nameMissing}
            />
          </FormField>
          <FormField
            label={t("form.description_label")}
            htmlFor="description-field"
          >
            <Input
              id="description-field"
              disabled={isSubmitting}
              placeholder={t("form.description_placeholder")}
              value={values.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </FormField>
          <FormField label={t("form.language_label")}>
            <SegmentedPicker
              mono
              ariaLabel={t("form.language_label")}
              value={values.language}
              onChange={(next) => updateField("language", next)}
              disabled={isSubmitting}
              options={(["bash", "python"] as const).map((lang) => ({
                value: lang,
                label: t(`form.language.${lang}`),
                icon: <TerminalSquare />,
              }))}
            />
          </FormField>
        </div>

        <div className="flex min-h-0 flex-col gap-2 split:overflow-hidden">
          <div className="flex shrink-0 items-baseline justify-between gap-4">
            <FieldLabel htmlFor="content-field" required>
              <span id="content-field-label">{t("form.content_label")}</span>
            </FieldLabel>
            <Text
              as="p"
              variant="meta"
              tone="muted"
              className="min-w-0 truncate max-sm:hidden"
              title={t(`form.language.${values.language}_hint`)}
            >
              {t(`form.language.${values.language}_hint`)}
            </Text>
          </div>
          <div className="min-h-[60dvh] flex-1 split:min-h-0">
            <CodeEditor
              id="content-field"
              ariaLabelledBy="content-field-label"
              required
              disabled={isSubmitting}
              placeholder={t("form.content_placeholder")}
              value={values.content}
              language={values.language}
              onBlur={() => setTouched(true)}
              onChange={(content) => updateField("content", content)}
              ariaInvalid={contentMissing}
              className="h-full"
            />
          </div>
          {contentMissing ? (
            <p className="shrink-0 text-xs text-destructive">
              {t("form.content_required")}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          {error ? <InlineAlert>{error}</InlineAlert> : null}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              asChild
              type="button"
              variant="outline"
              disabled={isSubmitting}
            >
              <AppLink href="/scripts">{t("form.cancel")}</AppLink>
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                trimmedName.length === 0 ||
                trimmedContent.length === 0
              }
            >
              {isSubmitting
                ? t("form.saving")
                : isEditing
                  ? t("form.save_changes")
                  : t("form.create")}
            </Button>
          </div>
        </div>
      </form>
    </>
  )
}

export function ScriptFormPage(props: ScriptFormPageProps) {
  return (
    <AppProviders>
      <ScriptFormPageInner {...props} />
    </AppProviders>
  )
}
