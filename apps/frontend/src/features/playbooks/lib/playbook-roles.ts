import type { PlaybookRepositoryRoles } from "@/features/playbooks/types"

/**
 * The roles a run of this playbook can turn off: those it declares that live
 * in the repository. External and dynamic ones have nothing to act on.
 */
export function selectableRoles(
  { roles, playbookRoles }: PlaybookRepositoryRoles,
  path: string | null
): PlaybookRepositoryRoles["roles"] {
  const declared = playbookRoles.find((usage) => usage.path === path)?.roles
  return (declared ?? []).flatMap((name) => {
    const role = roles.find((candidate) => candidate.name === name)
    return role ? [role] : []
  })
}
