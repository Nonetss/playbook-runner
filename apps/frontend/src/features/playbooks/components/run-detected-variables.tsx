import { getIcon } from "@/lib/icon-registry"

const Pencil = getIcon("actions", "edit")

import { useTranslation } from "react-i18next"
import { Text } from "@/components/shared/brand/typography"
import { Button } from "@/components/ui/button"
import {
  type DetectedVariable,
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
      <ul className="max-h-64 divide-y overflow-y-auto rounded-md border">
        {offered.map((variable) => (
          <li
            key={variable.name}
            className="flex items-start gap-2 py-1.5 pr-1 pl-2.5"
          >
            <div className="min-w-0 flex-1">
              <Text as="p" variant="data" className="wrap-anywhere">
                {variable.name}
              </Text>
              <Text
                as="p"
                variant="meta"
                tone="muted"
                className="wrap-anywhere"
              >
                {variable.role
                  ? t("run.panel.variable_from_role", { role: variable.role })
                  : t("run.panel.variable_from_play")}
                {" · "}
                {variable.value ?? t("run.panel.variable_no_value")}
              </Text>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground"
              aria-label={t("run.panel.variable_override_aria", {
                name: variable.name,
              })}
              title={t("run.panel.variable_override_aria", {
                name: variable.name,
              })}
              onClick={() => onOverride(variable)}
              disabled={disabled}
            >
              <Pencil className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
