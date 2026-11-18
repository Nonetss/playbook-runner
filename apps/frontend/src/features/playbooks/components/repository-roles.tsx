import { getIcon } from "@/lib/icon-registry"

const ChevronDown = getIcon("controls", "expand")

import { useId, useState } from "react"
import { useTranslation } from "react-i18next"
import { Text } from "@/components/shared/brand/typography"
import { InlineAlert } from "@/components/shared/feedback/inline-alert"
import { useRepositoryRoles } from "@/features/playbooks/hooks/use-repositories"
import type { PlaybookRepository } from "@/features/playbooks/types"
import { cn } from "@/lib/utils"

/** `a/b/site.yml` -> `site.yml`: the file is what tells playbooks apart. */
function fileName(path: string) {
  return path.slice(path.lastIndexOf("/") + 1)
}

/**
 * Read-only roles of a repository's synced commit, with a notice about the
 * `requirements.yml` dependencies a run will not install. Renders nothing when
 * there is nothing to report; a failure stays here, never hiding the playbooks.
 *
 * Roles are context, not the page's subject: the list starts closed behind a
 * heading that counts them, and each role is one line (name, path, who uses
 * it). The requirements notice stays visible, because it explains failures.
 */
export function RepositoryRoles({
  repository,
  enabled,
}: {
  repository: Pick<PlaybookRepository, "id" | "lastCommitSha">
  enabled: boolean
}) {
  const { t } = useTranslation("playbooks")
  const { data, error } = useRepositoryRoles(repository, enabled)
  const [open, setOpen] = useState(false)
  const listId = useId()

  if (error) {
    return (
      <InlineAlert title={t("repository.roles_load_error")}>
        <span className="font-mono text-xs">{error.message}</span>
      </InlineAlert>
    )
  }

  const roles = data?.roles ?? []
  const requirementsFiles = data?.requirementsFiles ?? []
  const usages = data?.playbookRoles ?? []
  if (roles.length === 0 && requirementsFiles.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {roles.length > 0 ? (
        <h3>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((current) => !current)}
            className="group -ml-1 flex items-center gap-2 rounded-sm px-1 py-1 text-muted-foreground transition-colors hover:text-foreground focus-ring pointer-coarse:py-2.5"
          >
            <ChevronDown
              aria-hidden
              className={cn(
                "size-4 shrink-0 transition-transform motion-reduce:transition-none",
                !open && "-rotate-90"
              )}
            />
            <Text variant="label">{t("repository.roles_heading")}</Text>
            <Text variant="meta" className="tabular-nums">
              {roles.length}
            </Text>
          </button>
        </h3>
      ) : null}
      {requirementsFiles.length > 0 ? (
        <InlineAlert
          tone="muted"
          title={t("repository.roles_requirements_title")}
        >
          {t("repository.roles_requirements_body")}
          <ul className="mt-1 font-mono text-xs">
            {requirementsFiles.map((file) => (
              <li key={file} className="break-all">
                {file}
              </li>
            ))}
          </ul>
        </InlineAlert>
      ) : null}
      {roles.length > 0 ? (
        <ul
          id={listId}
          hidden={!open}
          className="divide-y overflow-hidden rounded-xl border bg-card/40"
        >
          {roles.map((role) => {
            const usedBy = usages
              .filter((usage) => usage.roles.includes(role.name))
              .map((usage) => usage.path)
            return (
              <li
                key={role.path}
                className="grid gap-x-6 gap-y-0.5 px-4 py-2.5 sm:grid-cols-[13rem_minmax(0,24rem)_minmax(0,1fr)] sm:items-baseline"
              >
                <Text variant="data" className="truncate font-bold">
                  {role.name}
                </Text>
                <Text
                  variant="data"
                  tone="muted"
                  className="truncate"
                  title={role.path}
                >
                  {role.path}
                </Text>
                <Text
                  variant="meta"
                  tone="muted"
                  className="truncate"
                  title={usedBy.join(", ") || undefined}
                >
                  {usedBy.length > 0 ? (
                    <>
                      {t("repository.roles_used_by")}{" "}
                      <span className="font-mono text-xs text-foreground">
                        {usedBy.map(fileName).join(", ")}
                      </span>
                    </>
                  ) : (
                    t("repository.roles_unused")
                  )}
                </Text>
                {role.description ? (
                  <Text
                    as="p"
                    variant="meta"
                    tone="muted"
                    className="truncate sm:col-span-full"
                  >
                    {role.description}
                  </Text>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
