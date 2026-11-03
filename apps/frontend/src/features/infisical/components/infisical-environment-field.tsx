import * as React from "react"
import { useTranslation } from "react-i18next"
import { Text } from "@/components/shared/brand/typography"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useInfisicalConnectionsList,
  useInfisicalEnvironments,
} from "@/features/infisical/hooks/use-infisical-connections"

/**
 * The environment of a connection's project: a select starting on the first
 * one when Infisical lists them, a typed slug when it does not. A connection without a project cannot
 * list anything, so it asks for the project instead of offering a text box.
 */
export function InfisicalEnvironmentField({
  id,
  connectionId,
  value,
  onChange,
  disabled,
}: {
  id: string
  connectionId: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const { t } = useTranslation("infisical")
  const { data: environments = [], isPending } =
    useInfisicalEnvironments(connectionId)
  const { data: connections = [] } = useInfisicalConnectionsList()
  const connection = connections.find((item) => item.id === connectionId)
  const firstEnvironment = environments[0]?.slug

  React.useEffect(() => {
    if (!value && firstEnvironment && !disabled) onChange(firstEnvironment)
  }, [value, firstEnvironment, disabled, onChange])

  if (connection && !connection.projectId) {
    return (
      <div className="space-y-1">
        <Select disabled>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder={t("variables.environment_placeholder")} />
          </SelectTrigger>
        </Select>
        <Text as="p" variant="meta" className="text-destructive">
          {t("variables.environment_no_project")}{" "}
          <a
            href={`/ansible/infisical?edit=${connectionId}`}
            className="underline underline-offset-2"
          >
            {t("variables.environment_edit_connection")}
          </a>
        </Text>
      </div>
    )
  }

  if (environments.length === 0 && !isPending) {
    return (
      <div className="space-y-1">
        <Input
          id={id}
          className="font-mono"
          placeholder="dev"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          disabled={disabled}
        />
        <Text as="p" variant="meta" tone="muted">
          {t("variables.environment_not_listed")}
        </Text>
      </div>
    )
  }

  const isListed = environments.some((item) => item.slug === value)
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        // Radix emits "" while options load; never a user choice.
        if (next !== "") onChange(next)
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={t("variables.environment_placeholder")} />
      </SelectTrigger>
      <SelectContent>
        {value && !isListed ? (
          <SelectItem value={value}>{value}</SelectItem>
        ) : null}
        {environments.map((item) => (
          <SelectItem key={item.slug} value={item.slug}>
            {item.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
