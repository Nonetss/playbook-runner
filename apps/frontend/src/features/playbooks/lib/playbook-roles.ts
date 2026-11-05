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
 * `ansible_*` names are reserved for the runner: a run can neither override
 * them nor point them at a secret, even when a role defines one of its own.
 */
export function isReservedVariable(name: string): boolean {
  return name.toLowerCase().startsWith("ansible_")
}

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

export type VariableGroup = {
  kind: "undefined" | "play" | "role"
  role: string | null
  variables: DetectedVariable[]
}

/**
 * What nothing defines comes first, since a run may need it; then the play's,
 * then one group per role in the order the runner found them.
 */
export function groupedVariables(
  variables: DetectedVariable[]
): VariableGroup[] {
  const undefinedOnes = variables.filter((variable) => variable.usedOnly)
  const defined = variables.filter((variable) => !variable.usedOnly)
  const roles = [...new Set(defined.flatMap((variable) => variable.role ?? []))]
  const groups: VariableGroup[] = [
    { kind: "undefined", role: null, variables: undefinedOnes },
    {
      kind: "play",
      role: null,
      variables: defined.filter((variable) => !variable.role),
    },
    ...roles.map(
      (role): VariableGroup => ({
        kind: "role",
        role,
        variables: defined.filter((variable) => variable.role === role),
      })
    ),
  ]
  return groups.filter((group) => group.variables.length > 0)
}
