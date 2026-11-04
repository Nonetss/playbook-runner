import { getIcon } from "@/lib/icon-registry"

const ChevronDown = getIcon("controls", "expand")
const Search = getIcon("views", "search")

import { type ReactNode, useState } from "react"
import { useTranslation } from "react-i18next"
import { Text } from "@/components/shared/brand/typography"
import { Input } from "@/components/ui/input"
import {
  type DetectedVariable,
  groupedVariables,
  type VariableGroup,
} from "@/features/playbooks/lib/playbook-roles"
import { matchesEveryWord } from "@/lib/fold-text"
import { cn } from "@/lib/utils"

/**
 * A playbook's variables as one line each: what needs attention open, each
 * role folded. `action` is what a row offers (override, use a secret).
 */
export function DetectedVariableGroups({
  variables,
  action,
}: {
  variables: DetectedVariable[]
  action: (variable: DetectedVariable) => ReactNode
}) {
  const { t } = useTranslation("playbooks")
  const [search, setSearch] = useState("")
  const groups = groupedVariables(
    variables.filter((variable) => matchesEveryWord(search, [variable.name]))
  )

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("run.panel.variables_search")}
          aria-label={t("run.panel.variables_search")}
          className="h-8 pl-8 text-xs"
        />
      </div>
      {groups.length === 0 ? (
        <Text as="p" variant="meta" tone="muted">
          {t("run.panel.variables_no_match")}
        </Text>
      ) : (
        <div className="divide-y rounded-md border">
          {groups.map((group) => (
            <Group
              key={`${group.kind}:${group.role ?? ""}`}
              group={group}
              // Searching folds nothing: a match must not stay hidden.
              forceOpen={search.trim() !== ""}
              action={action}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Group({
  group,
  forceOpen,
  action,
}: {
  group: VariableGroup
  forceOpen: boolean
  action: (variable: DetectedVariable) => ReactNode
}) {
  const { t } = useTranslation("playbooks")
  const [expanded, setExpanded] = useState(group.kind !== "role")
  const open = forceOpen || expanded
  const label =
    group.kind === "undefined"
      ? t("run.panel.variables_group_undefined")
      : group.kind === "play"
        ? t("run.panel.variables_group_play")
        : group.role

  return (
    <section>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setExpanded(!open)}
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left"
      >
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            !open && "-rotate-90"
          )}
        />
        <Text
          as="span"
          variant={group.kind === "role" ? "data" : "meta"}
          className="min-w-0 flex-1 truncate"
        >
          {label}
        </Text>
        <Text as="span" variant="data" tone="muted">
          {group.variables.length}
        </Text>
      </button>
      {open ? (
        <ul className="pb-1">
          {group.variables.map((variable) => (
            <Row key={variable.name} variable={variable} action={action} />
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function Row({
  variable,
  action,
}: {
  variable: DetectedVariable
  action: (variable: DetectedVariable) => ReactNode
}) {
  const { t } = useTranslation("playbooks")
  const value = variable.usedOnly
    ? variable.role
      ? t("run.panel.variable_from_role", { role: variable.role })
      : ""
    : (variable.value ?? t("run.panel.variable_no_value"))

  return (
    <li
      title={value ? `${variable.name}: ${value}` : variable.name}
      className="flex items-center gap-2 pr-1 pl-7"
    >
      <Text
        as="span"
        variant="data"
        className="min-w-0 max-w-[70%] shrink-0 truncate"
      >
        {variable.name}
      </Text>
      <Text
        as="span"
        variant="meta"
        tone="muted"
        className="min-w-0 flex-1 truncate text-right"
      >
        {value}
      </Text>
      {action(variable)}
    </li>
  )
}
