import { getIcon } from "@/lib/icon-registry"

const Pencil = getIcon("actions", "edit")

import { useTranslation } from "react-i18next"
import { Text } from "@/components/shared/brand/typography"
import { Button } from "@/components/ui/button"
import { DetectedVariableGroups } from "@/features/playbooks/components/detected-variable-groups"
import {
  type DetectedVariable,
  isReservedVariable,
  offeredVariables,
} from "@/features/playbooks/lib/playbook-roles"

/** What the playbook defines: read-only until a run overrides one of them. */
export function RunDetectedVariables({
  variables,
  uncheckedRoles,
  takenNames,
  onOverride,
  disabled,
}: {
  variables: DetectedVariable[]
  uncheckedRoles: ReadonlySet<string>
  takenNames: ReadonlySet<string>
  onOverride: (variable: DetectedVariable) => void
  disabled: boolean
}) {
  const { t } = useTranslation("playbooks")
  const offered = offeredVariables(variables, uncheckedRoles, takenNames)
  if (offered.length === 0) return null

  return (
    <div className="space-y-2">
      <Text as="p" variant="meta" tone="muted">
        {t("run.panel.variables_detected")}
      </Text>
      <DetectedVariableGroups
        variables={offered}
        action={(variable) => {
          if (isReservedVariable(variable.name)) {
            return (
              <Text
                as="span"
                variant="meta"
                tone="muted"
                className="shrink-0 py-1"
                title={t("run.panel.variable_reserved_hint")}
              >
                {t("run.panel.variable_reserved")}
              </Text>
            )
          }
          const label = t("run.panel.variable_override_aria", {
            name: variable.name,
          })
          return (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground"
              aria-label={label}
              title={label}
              onClick={() => onOverride(variable)}
              disabled={disabled}
            >
              <Pencil className="size-3.5" />
            </Button>
          )
        }}
      />
    </div>
  )
}
