import { useTranslation } from "react-i18next"
import { InlineAlert } from "@/components/shared/feedback/inline-alert"
import { useRepositoryRoles } from "@/features/playbooks/hooks/use-repositories"
import type { PlaybookRepository } from "@/features/playbooks/types"

type RolesRepository = Pick<PlaybookRepository, "id" | "lastCommitSha">

/**
 * What a repository's roles say about running it: a failure to read them, and
 * the `requirements.yml` files whose dependencies a run will not install. Both
 * stay on the page, because the second explains failures. Renders nothing when
 * there is nothing to report; it never hides the playbooks.
 */
export function RepositoryRolesNotice({
  repository,
  enabled,
}: {
  repository: RolesRepository
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

  const requirementsFiles = data?.requirementsFiles ?? []
  if (requirementsFiles.length === 0) return null

  return (
    <InlineAlert tone="muted" title={t("repository.roles_requirements_title")}>
      {t("repository.roles_requirements_body")}
      <ul className="mt-1 font-mono text-xs">
        {requirementsFiles.map((file) => (
          <li key={file} className="break-all">
            {file}
          </li>
        ))}
      </ul>
    </InlineAlert>
  )
}
