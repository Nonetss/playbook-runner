import { useQuery } from "@tanstack/react-query"
import * as React from "react"
import { useTranslation } from "react-i18next"
import { InlineAlert } from "@/components/shared/feedback/inline-alert"
import { FormField } from "@/components/shared/form/field-label"
import { FormDialog } from "@/components/shared/form/form-dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCredentialsList } from "@/features/credentials/hooks/use-credentials"
import {
  useRepositoryCreate,
  useRepositoryUpdate,
} from "@/features/playbooks/hooks/use-repositories"
import type { PlaybookRepository } from "@/features/playbooks/types"
import { useOnOpen } from "@/hooks/use-on-open"
import { orpc } from "@/lib/orpc"

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

/** Radix Select cannot use `value=""`; this sentinel means "no credential". */
const NO_CREDENTIAL = "__none__"

/** Wait for the user to stop typing before asking the remote for branches. */
const BRANCHES_DEBOUNCE_MS = 600

/** Same shapes the API accepts: `https://`, `ssh://` or `user@host:path`. */
function looksLikeGitUrl(value: string) {
  return (
    /^(https:\/\/|ssh:\/\/)\S+$/.test(value) ||
    /^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+:\S+$/.test(value)
  )
}

function valuesFrom(repository: PlaybookRepository | null) {
  if (!repository) return emptyValues
  return {
    name: repository.name,
    url: repository.url,
    branch: repository.branch,
    subdir: repository.subdir ?? "",
    credentialId: repository.credentialId ?? "",
  }
}

/**
 * Lists the remote's branches once the URL (and credential) settle, so the
 * branch field can be a select. Falls back to free text when the remote
 * can't be listed (typo, private repo without credential, runner down).
 */
function useRemoteBranches(url: string, credentialId: string, open: boolean) {
  const [source, setSource] = React.useState({ url, credentialId })

  React.useEffect(() => {
    const timer = window.setTimeout(
      () => setSource({ url: url.trim(), credentialId }),
      BRANCHES_DEBOUNCE_MS
    )
    return () => window.clearTimeout(timer)
  }, [url, credentialId])

  const enabled = open && looksLikeGitUrl(source.url)
  const query = useQuery({
    ...orpc.repositories.branches.queryOptions({
      input: {
        url: source.url,
        credentialId: source.credentialId || null,
      },
    }),
    enabled,
    retry: false,
    staleTime: 60_000,
  })
  const settled =
    source.url === url.trim() && source.credentialId === credentialId
  return {
    enabled,
    // Typing a new URL: don't show the previous remote's branches.
    data: settled && enabled ? query.data : undefined,
    isLoading: enabled && (!settled || query.isFetching) && !query.data,
    error: settled && enabled && query.isError ? query.error : null,
  }
}

export function RepositoryFormModal({
  open,
  onOpenChange,
  repository = null,
  onCreated,
}: RepositoryFormModalProps) {
  const { t } = useTranslation("playbooks")
  const { t: tCommon } = useTranslation("common")
  const { data: credentials = [] } = useCredentialsList()
  const createRepository = useRepositoryCreate()
  const updateRepository = useRepositoryUpdate()
  const isEditing = !!repository
  const isSubmitting = createRepository.isPending || updateRepository.isPending

  const [values, setValues] = React.useState<RepositoryFormValues>(emptyValues)
  const [error, setError] = React.useState<string | null>(null)

  useOnOpen(open, () => {
    setValues(valuesFrom(repository))
    setError(null)
  })

  const remote = useRemoteBranches(values.url, values.credentialId, open)
  // While editing the same remote, keep the saved branch selectable even if
  // it no longer exists upstream (the next sync will report it).
  const keepsSavedBranch = !!repository && values.url.trim() === repository.url
  const listed = remote.data?.branches
  const branches =
    listed && keepsSavedBranch && !listed.includes(repository.branch)
      ? [...listed, repository.branch]
      : listed

  // A new remote was listed: keep the chosen branch if it exists there,
  // otherwise preselect the remote's default one.
  React.useEffect(() => {
    if (!remote.data || remote.data.branches.length === 0) return
    const { branches: listed, defaultBranch } = remote.data
    setValues((current) =>
      listed.includes(current.branch) ||
      (keepsSavedBranch && current.branch === repository?.branch)
        ? current
        : {
            ...current,
            branch:
              defaultBranch && listed.includes(defaultBranch)
                ? defaultBranch
                : (listed[0] ?? current.branch),
          }
    )
  }, [remote.data, keepsSavedBranch, repository?.branch])

  function updateField(key: keyof RepositoryFormValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError(null)
    const payload = {
      name: values.name,
      url: values.url.trim(),
      branch: values.branch.trim() || "main",
      subdir: values.subdir || null,
      credentialId: values.credentialId || null,
    }
    try {
      if (repository) {
        await updateRepository.mutateAsync({ id: repository.id, ...payload })
      } else {
        const created = await createRepository.mutateAsync(payload)
        onCreated?.(created)
      }
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : tCommon("labels.error_saving")
      )
    }
  }

  const branchHint = remote.isLoading
    ? t("repository.branches_loading")
    : remote.error
      ? t("repository.branches_error", { message: remote.error.message })
      : branches
        ? branches.length === 0
          ? t("repository.branches_empty")
          : undefined
        : t("repository.branches_hint")

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!isSubmitting) onOpenChange(next)
      }}
      title={
        isEditing ? t("repository.edit_title") : t("repository.create_title")
      }
      description={t("repository.form_subtitle")}
      onSubmit={handleSubmit}
      isPending={isSubmitting}
      submitLabel={
        isSubmitting
          ? tCommon("actions.saving")
          : isEditing
            ? t("repository.save")
            : t("repository.create")
      }
      cancelLabel={tCommon("actions.cancel")}
      formId="playbook-repository-form"
    >
      <FormField
        label={t("repository.name_label")}
        htmlFor="repository-name"
        required
      >
        <Input
          id="repository-name"
          required
          disabled={isSubmitting}
          placeholder={t("repository.name_placeholder")}
          value={values.name}
          onChange={(e) => updateField("name", e.target.value)}
        />
      </FormField>

      <FormField
        label={t("repository.url_label")}
        htmlFor="repository-url"
        required
      >
        <Input
          id="repository-url"
          required
          disabled={isSubmitting}
          placeholder={t("repository.url_placeholder")}
          value={values.url}
          onChange={(e) => updateField("url", e.target.value)}
          className="font-mono"
          autoComplete="off"
          spellCheck={false}
        />
      </FormField>

      <FormField
        label={t("repository.credential_label")}
        htmlFor="repository-credential"
        hint={t("repository.credential_hint")}
      >
        <Select
          value={values.credentialId || NO_CREDENTIAL}
          onValueChange={(next) => {
            // Radix emits "" while options load; never a user choice.
            if (next === "") return
            updateField("credentialId", next === NO_CREDENTIAL ? "" : next)
          }}
          disabled={isSubmitting}
        >
          <SelectTrigger id="repository-credential" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CREDENTIAL}>
              {t("repository.credential_none")}
            </SelectItem>
            {credentials.map((credential) => (
              <SelectItem key={credential.id} value={credential.id}>
                {credential.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        label={t("repository.branch_label")}
        htmlFor="repository-branch"
        required
        hint={branchHint}
      >
        {branches && branches.length > 0 ? (
          <Select
            value={values.branch}
            onValueChange={(next) => {
              if (next !== "") updateField("branch", next)
            }}
            disabled={isSubmitting}
          >
            <SelectTrigger id="repository-branch" className="w-full font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch} value={branch} className="font-mono">
                  {branch}
                  {branch === remote.data?.defaultBranch
                    ? ` · ${t("repository.default_branch")}`
                    : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="repository-branch"
            required
            disabled={isSubmitting || remote.isLoading}
            placeholder="main"
            value={values.branch}
            onChange={(e) => updateField("branch", e.target.value)}
            className="font-mono"
            autoComplete="off"
            spellCheck={false}
          />
        )}
      </FormField>

      <FormField
        label={t("repository.subdir_label")}
        htmlFor="repository-subdir"
      >
        <Input
          id="repository-subdir"
          disabled={isSubmitting}
          placeholder={t("repository.subdir_placeholder")}
          value={values.subdir}
          onChange={(e) => updateField("subdir", e.target.value)}
          className="font-mono"
          autoComplete="off"
          spellCheck={false}
        />
      </FormField>

      {error ? <InlineAlert>{error}</InlineAlert> : null}
    </FormDialog>
  )
}
