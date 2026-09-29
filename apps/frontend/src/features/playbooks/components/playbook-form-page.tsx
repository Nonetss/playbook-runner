import { getIcon } from "@/lib/icon-registry"

const Copy = getIcon("actions", "copy")
const Play = getIcon("actions", "play")

import * as React from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { CodeEditor } from "@/components/shared/code-editor"
import { InlineAlert } from "@/components/shared/feedback/inline-alert"
import { StateCard } from "@/components/shared/feedback/state-card"
import { FieldLabel, FormField } from "@/components/shared/form/field-label"
import { DetailFrame } from "@/components/shared/layout/detail-frame"
import { PageHero } from "@/components/shared/layout/page-hero"
import { AppLink } from "@/components/ui/app-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PLAYBOOK_ROOT_FOLDER_VALUE,
  toFolderId,
} from "@/features/playbooks/folder-id"
import { usePlaybookFoldersList } from "@/features/playbooks/hooks/use-playbook-folders"
import {
  usePlaybookCreate,
  usePlaybookGet,
  usePlaybookUpdate,
} from "@/features/playbooks/hooks/use-playbooks"
import { useRepositoriesList } from "@/features/playbooks/hooks/use-repositories"
import { useConfirm } from "@/hooks/use-confirm"
import { navigate } from "@/lib/navigate"

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
      : toFolderId(new URLSearchParams(window.location.search).get("folder"))
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

  // Git-sourced playbooks are owned by their repository sync: view only.
  const isGit = isEditing && playbook?.source === "git"
  const { data: repositories = [] } = useRepositoriesList()
  const repository = isGit
    ? repositories.find((item) => item.id === playbook?.repositoryId)
    : undefined

  const confirm = useConfirm()
  const { t: tCommon } = useTranslation("common")

  /**
   * Copy a Git playbook into an inline one the user can edit. Only this file
   * travels: roles, templates and vars next to it in the repository don't.
   */
  async function handleCopy() {
    if (!playbook) return
    const confirmed = await confirm({
      title: t("repository.copy_title", { name: playbook.name }),
      description: t("repository.copy_description"),
      confirmLabel: t("repository.copy"),
      cancelLabel: tCommon("actions.cancel"),
    })
    if (!confirmed) return
    try {
      const created = await createPlaybook.mutateAsync({
        name: t("repository.copy_name", { name: playbook.name }),
        description: t("repository.copy_origin", {
          repository: repository?.name ?? "Git",
          path: playbook.path ?? playbook.name,
          commit: repository?.lastCommitSha?.slice(0, 7) ?? "—",
        }),
        content: playbook.content,
        folderId: null,
      })
      navigate(`/playbooks/${created.id}/edit`)
    } catch {
      // The shared mutation hook displays the localized error toast.
    }
  }

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
  const isLocked = isSubmitting || isGit
  const returnHref = isGit
    ? "/playbooks"
    : values.folderId
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
      folderId: toFolderId(values.folderId),
    }
    try {
      if (isEditing && id) {
        await updatePlaybook.mutateAsync({ id, ...payload })
      } else {
        await createPlaybook.mutateAsync(payload)
      }
      navigate(returnHref)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.save_error"))
    }
  }

  const frame = (children: React.ReactNode) => (
    <DetailFrame
      backHref={returnHref}
      backLabel={t("form.back_to_playbooks")}
      maxWidth="full"
    >
      {children}
    </DetailFrame>
  )

  if (isEditing && isLoading) {
    return frame(<StateCard spinner title={t("form.loading")} />)
  }

  if (isEditing && (isLoadError || !playbook)) {
    return frame(<StateCard tone="destructive" title={t("form.load_error")} />)
  }

  return frame(
    <>
      <PageHero
        surface="playbooks"
        title={
          isGit
            ? t("form.view_title")
            : isEditing
              ? t("form.edit_title")
              : t("form.create_title")
        }
        description={
          isGit
            ? t("form.git_subtitle")
            : isEditing
              ? t("form.edit_subtitle")
              : t("form.create_subtitle")
        }
        action={
          isEditing && id ? (
            <div className="flex flex-wrap items-center gap-2">
              {isGit ? (
                <Button
                  variant="outline"
                  onClick={handleCopy}
                  disabled={createPlaybook.isPending}
                >
                  <Copy className="size-4" />
                  {t("repository.copy")}
                </Button>
              ) : null}
              {playbook?.missing ? null : (
                <Button asChild variant="outline">
                  <AppLink
                    href={`/playbooks/${id}/run`}
                    aria-label={t("form.run_aria")}
                  >
                    <Play className="size-4" />
                    {t("form.run")}
                  </AppLink>
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      <form
        onSubmit={handleSubmit}
        className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-5 split:overflow-hidden"
      >
        <div className="grid gap-5 lg:grid-cols-3">
          <FormField label={t("form.name_label")} htmlFor="name-field" required>
            <Input
              id="name-field"
              required
              disabled={isLocked}
              placeholder={t("form.name_placeholder")}
              value={values.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </FormField>
          <FormField
            label={t("form.description_label")}
            htmlFor="description-field"
          >
            <Input
              id="description-field"
              disabled={isLocked}
              placeholder={t("form.description_placeholder")}
              value={values.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </FormField>
          {isGit ? (
            <FormField
              label={t("repository.source_label")}
              htmlFor="source-field"
            >
              <Input
                id="source-field"
                disabled
                className="font-mono"
                value={`${repository?.name ?? "—"} · ${playbook?.path ?? ""}`}
              />
            </FormField>
          ) : (
            <FormField label={t("form.folder_label")} htmlFor="folder-field">
              <Select
                value={values.folderId ?? PLAYBOOK_ROOT_FOLDER_VALUE}
                onValueChange={(value) => {
                  // Radix fires "" when the current value has no matching item
                  // yet (folders still loading). The root option is the
                  // sentinel, so "" is never a user choice: ignore it instead of
                  // silently moving the playbook to the root.
                  if (value === "") return
                  setValues((current) => ({
                    ...current,
                    folderId: toFolderId(value),
                  }))
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger id="folder-field" className="w-full">
                  <SelectValue placeholder={t("form.folder_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={PLAYBOOK_ROOT_FOLDER_VALUE}>
                      {t("folder.root")}
                    </SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FormField>
          )}
        </div>

        <div className="flex min-h-0 flex-col gap-2 split:overflow-hidden">
          <FieldLabel htmlFor="content-field" required className="shrink-0">
            <span id="content-field-label">{t("form.content_label")}</span>
          </FieldLabel>
          {isGit ? (
            <InlineAlert
              tone={playbook?.missing ? "destructive" : "muted"}
              className="shrink-0 text-xs"
            >
              {playbook?.missing
                ? t("repository.missing_notice")
                : t("repository.read_only_notice", {
                    commit: repository?.lastCommitSha?.slice(0, 7) ?? "—",
                  })}
            </InlineAlert>
          ) : null}
          <InlineAlert tone="muted" className="shrink-0 text-xs">
            <span
              className="[&_code]:font-mono [&_code]:text-foreground"
              dangerouslySetInnerHTML={{
                __html: t("form.hosts_all_warning"),
              }}
            />
          </InlineAlert>
          <div className="min-h-[60dvh] flex-1 split:min-h-0">
            <CodeEditor
              id="content-field"
              ariaLabelledBy="content-field-label"
              required
              disabled={isLocked}
              placeholder={t("form.content_placeholder")}
              value={values.content}
              language="yaml"
              onChange={(content) => updateField("content", content)}
              className="h-full"
            />
          </div>
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
              <AppLink href={returnHref}>
                {isGit ? t("form.back_to_playbooks") : t("form.cancel")}
              </AppLink>
            </Button>
            {isGit ? null : (
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
            )}
          </div>
        </div>
      </form>
    </>
  )
}

export function PlaybookFormPage(props: PlaybookFormPageProps) {
  return (
    <AppProviders>
      <PlaybookFormPageInner {...props} />
    </AppProviders>
  )
}
