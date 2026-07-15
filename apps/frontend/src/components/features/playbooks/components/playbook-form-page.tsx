import { ArrowLeft, Loader2 } from "lucide-react"
import * as React from "react"
import { useTranslation } from "react-i18next"
import { usePlaybookFoldersList } from "@/components/features/playbooks/hooks/usePlaybookFolders"
import {
  usePlaybookCreate,
  usePlaybookGet,
  usePlaybookUpdate,
} from "@/components/features/playbooks/hooks/usePlaybooks"
import { AppProviders } from "@/components/providers/app-providers"
import { CodeEditor } from "@/components/shared/code-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type FormValues = {
  name: string
  description: string
  content: string
  folderId: string | null
}

function getInitialValues(): FormValues {
  const folderId =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("folder")
  return { name: "", description: "", content: "", folderId }
}

export type PlaybookFormPageProps = {
  /** When present the page edits an existing playbook; otherwise it creates one. */
  id?: string
}

function PlaybookFormPageInner({ id }: PlaybookFormPageProps) {
  const { t } = useTranslation("playbooks")
  const isEditing = !!id
  const createPlaybook = usePlaybookCreate()
  const updatePlaybook = usePlaybookUpdate()
  const { data: folders = [] } = usePlaybookFoldersList()
  const {
    data: playbook,
    isPending: isLoading,
    isError: isLoadError,
  } = usePlaybookGet(id ?? "", { enabled: isEditing })

  const [values, setValues] = React.useState<FormValues>(getInitialValues)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (isEditing && playbook) {
      setValues({
        name: playbook.name,
        description: playbook.description ?? "",
        content: playbook.content,
        folderId: playbook.folderId,
      })
    }
  }, [isEditing, playbook])

  const isSubmitting = createPlaybook.isPending || updatePlaybook.isPending
  const returnHref = values.folderId
    ? `/playbooks?folder=${encodeURIComponent(values.folderId)}`
    : "/playbooks"

  function updateField(key: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (values.content.trim().length === 0) return
    setError(null)
    const payload = {
      name: values.name,
      description: values.description || undefined,
      content: values.content,
      folderId: values.folderId,
    }
    try {
      if (isEditing && id) {
        await updatePlaybook.mutateAsync({ id, ...payload })
      } else {
        await createPlaybook.mutateAsync(payload)
      }
      window.location.href = returnHref
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

  if (isEditing && (isLoadError || !playbook)) {
    return (
      <main className="w-full flex-1 p-6 lg:px-8">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {t("form.load_error")}
        </div>
        <Button asChild variant="outline" className="mt-4">
          <a href={returnHref}>
            <ArrowLeft className="size-4" />
            {t("form.back_to_playbooks")}
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
          aria-label={t("run.back_aria")}
        >
          <a href={returnHref}>
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
        <div className="grid gap-5 lg:grid-cols-3">
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
              onChange={(e) => updateField("name", e.target.value)}
            />
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
          <div className="space-y-2">
            <Label htmlFor="folder-field">{t("form.folder_label")}</Label>
            <Select
              value={values.folderId ?? "__root__"}
              onValueChange={(value) =>
                setValues((current) => ({
                  ...current,
                  folderId: value === "__root__" ? null : value,
                }))
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="folder-field" className="w-full">
                <SelectValue placeholder={t("form.folder_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="__root__">{t("folder.root")}</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-1 flex-col space-y-2">
          <Label id="content-field-label" htmlFor="content-field">
            {t("form.content_label")}
            <span aria-hidden> *</span>
          </Label>
          <div
            className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: t("form.hosts_all_warning"),
            }}
          />
          <CodeEditor
            id="content-field"
            ariaLabelledBy="content-field-label"
            required
            disabled={isSubmitting}
            placeholder={t("form.content_placeholder")}
            value={values.content}
            language="yaml"
            onChange={(content) => updateField("content", content)}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end gap-2 pb-2">
          <Button
            asChild
            type="button"
            variant="outline"
            disabled={isSubmitting}
          >
            <a href={returnHref}>{t("form.cancel")}</a>
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || values.content.trim().length === 0}
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

export function PlaybookFormPage(props: PlaybookFormPageProps) {
  return (
    <AppProviders>
      <PlaybookFormPageInner {...props} />
    </AppProviders>
  )
}
