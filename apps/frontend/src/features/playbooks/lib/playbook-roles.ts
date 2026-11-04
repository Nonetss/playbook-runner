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

export type DetectedVariable =
  PlaybookRepositoryRoles["playbookVariables"][number]["variables"][number]

/**
 * The variables a run of this playbook could override, one per name: without
 * those of unchecked roles, or those that already have a row. The play comes
 * first, as the runner lists it.
 */
export function offeredVariables(
  variables: DetectedVariable[],
  uncheckedRoles: ReadonlySet<string>,
  takenNames: ReadonlySet<string>
): DetectedVariable[] {
  const seen = new Set(takenNames)
  return variables.filter((variable) => {
    if (seen.has(variable.name)) return false
    if (variable.role && uncheckedRoles.has(variable.role)) return false
    seen.add(variable.name)
    return true
  })
}
