import { useTranslation } from "react-i18next"
import { Text } from "@/components/shared/brand/typography"
import { InlineAlert } from "@/components/shared/feedback/inline-alert"
import { useRepositoryRoles } from "@/features/playbooks/hooks/use-repositories"
import type { PlaybookRepository } from "@/features/playbooks/types"

/**
 * Read-only roles of a repository's synced commit, with a notice about the
 * `requirements.yml` dependencies a run will not install. Renders nothing when
 * there is nothing to report; a failure stays here, never hiding the playbooks.
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
      <Text as="h3" variant="label" tone="muted">
        {t("repository.roles_heading")}
      </Text>
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
        <ul className="divide-y rounded-xl border">
          {roles.map((role) => {
            const usedBy = usages
              .filter((usage) => usage.roles.includes(role.name))
              .map((usage) => usage.path)
            return (
              <li key={role.path} className="px-4 py-3">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
                  <Text variant="data">{role.name}</Text>
                  <Text variant="data" tone="muted" className="break-all">
                    {role.path}
                  </Text>
                </div>
                {role.description ? (
                  <Text as="p" variant="meta" tone="muted" className="mt-1">
                    {role.description}
                  </Text>
                ) : null}
                <Text as="p" variant="meta" tone="muted" className="mt-1">
                  {usedBy.length > 0 ? (
                    <>
                      {t("repository.roles_used_by")}{" "}
                      <span className="break-all font-mono text-xs">
                        {usedBy.join(", ")}
                      </span>
                    </>
                  ) : (
                    t("repository.roles_not_declared")
                  )}
                </Text>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
