import { useTranslation } from "react-i18next"
import { Text } from "@/components/shared/brand/typography"
import { Checkbox } from "@/components/ui/checkbox"
import type { PlaybookRepositoryRoles } from "@/features/playbooks/types"
import { TerminalPanelCollapsible } from "@/features/run/components/terminal-frame"

/** Which of the playbook's roles a run uses: all of them unless unchecked. */
export function RunRolesSelection({
  roles,
  unchecked,
  onChange,
  disabled,
}: {
  roles: PlaybookRepositoryRoles["roles"]
  unchecked: ReadonlySet<string>
  onChange: (unchecked: ReadonlySet<string>) => void
  disabled: boolean
}) {
  const { t } = useTranslation("playbooks")
  if (roles.length === 0) return null

  const toggle = (name: string) => {
    const next = new Set(unchecked)
    if (!next.delete(name)) next.add(name)
    onChange(next)
  }
  const checkedCount = roles.filter((role) => !unchecked.has(role.name)).length

  return (
    <TerminalPanelCollapsible
      label={t("run.panel.roles")}
      defaultOpen={false}
      aside={
        <Text variant="data" tone="muted">
          {checkedCount}/{roles.length}
        </Text>
      }
      className="border-t pt-5"
    >
      <ul className="space-y-2.5">
        {roles.map((role) => (
          <li key={role.path}>
            <label
              htmlFor={`run-role-${role.name}`}
              className="flex cursor-pointer items-start gap-2.5"
            >
              <Checkbox
                id={`run-role-${role.name}`}
                className="mt-0.5"
                checked={!unchecked.has(role.name)}
                disabled={disabled}
                onCheckedChange={() => toggle(role.name)}
              />
              <span className="min-w-0">
                <Text as="span" variant="data" className="block break-words">
                  {role.name}
                </Text>
                {role.description ? (
                  <Text as="span" variant="meta" tone="muted" className="block">
                    {role.description}
                  </Text>
                ) : null}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <Text as="p" variant="meta" tone="muted">
        {t("run.panel.roles_loose_tasks")}
      </Text>
    </TerminalPanelCollapsible>
  )
}
