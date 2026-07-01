import { ArrowLeft, Loader2, TerminalSquare } from "lucide-react"
import * as React from "react"
import { useTranslation } from "react-i18next"
import {
  useScriptCreate,
  useScriptGet,
  useScriptUpdate,
} from "@/components/features/scripts/hooks/useScripts"
import { AppProviders } from "@/components/providers/app-providers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const TEXTAREA_CLASS =
  "w-full min-w-0 flex-1 resize-y rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs leading-relaxed shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"

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

function LanguagePicker({
  value,
  onChange,
  disabled,
  labels,
  hints,
}: {
  value: ScriptLanguage
  onChange: (next: ScriptLanguage) => void
  disabled?: boolean
  labels: Record<ScriptLanguage, string>
  hints: Record<ScriptLanguage, string>
}) {
  const active = value
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        {(["bash", "python"] as ScriptLanguage[]).map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => onChange(lang)}
            disabled={disabled}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              value === lang
                ? "border-primary bg-primary/10 text-foreground"
                : "border-input text-muted-foreground hover:bg-accent"
            )}
          >
            <TerminalSquare className="size-3.5" />
            {labels[lang]}
          </button>
        ))}
      </div>
      <p className="text-muted-foreground text-[11px] leading-snug">
        {hints[active]}
      </p>
    </div>
  )
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
      window.location.href = "/scripts"
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.save_error"))
    }
  }

  if (isEditing && isLoading) {
    return (
      <main className="flex w-full flex-1 items-center justify-center p-6 lg:px-8">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          {t("form.loading")}
        </div>
      </main>
    )
  }

  if (isEditing && (isLoadError || !script)) {
    return (
      <main className="w-full flex-1 p-6 lg:px-8">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {t("form.load_error")}
        </div>
        <Button asChild variant="outline" className="mt-4">
          <a href="/scripts">
            <ArrowLeft className="size-4" />
            {t("form.back_to_scripts")}
          </a>
        </Button>
      </main>
    )
  }

  return (
    <main className="flex w-full flex-1 flex-col p-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          aria-label={t("form.back_aria")}
        >
          <a href="/scripts">
            <ArrowLeft className="size-4" />
          </a>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing ? t("form.edit_title") : t("form.create_title")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isEditing ? t("form.edit_subtitle") : t("form.create_subtitle")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name-field">
              {t("form.name_label")}
              <span aria-hidden> *</span>
            </Label>
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
            {nameMissing ? (
              <p className="text-destructive text-xs">
                {t("form.name_required")}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description-field">
              {t("form.description_label")}
            </Label>
            <Input
              id="description-field"
              disabled={isSubmitting}
              placeholder={t("form.description_placeholder")}
              value={values.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("form.language_label")}</Label>
          <LanguagePicker
            value={values.language}
            onChange={(next) => updateField("language", next)}
            disabled={isSubmitting}
            labels={{
              bash: t("form.language.bash"),
              python: t("form.language.python"),
            }}
            hints={{
              bash: t("form.language.bash_hint"),
              python: t("form.language.python_hint"),
            }}
          />
        </div>

        <div className="flex flex-1 flex-col space-y-2">
          <Label htmlFor="content-field">
            {t("form.content_label")}
            <span aria-hidden> *</span>
          </Label>
          <textarea
            id="content-field"
            required
            disabled={isSubmitting}
            placeholder={t("form.content_placeholder")}
            value={values.content}
            spellCheck={false}
            className={TEXTAREA_CLASS}
            style={{ minHeight: "24rem" }}
            onBlur={() => setTouched(true)}
            onChange={(e) => updateField("content", e.target.value)}
            aria-invalid={contentMissing}
          />
          {contentMissing ? (
            <p className="text-destructive text-xs">
              {t("form.content_required")}
            </p>
          ) : null}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end gap-2 pb-2">
          <Button
            asChild
            type="button"
            variant="outline"
            disabled={isSubmitting}
          >
            <a href="/scripts">{t("form.cancel")}</a>
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
      </form>
    </main>
  )
}

export function ScriptFormPage(props: ScriptFormPageProps) {
  return (
    <AppProviders>
      <ScriptFormPageInner {...props} />
    </AppProviders>
  )
}
