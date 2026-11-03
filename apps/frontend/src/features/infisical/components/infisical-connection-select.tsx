import { useTranslation } from "react-i18next"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useInfisicalConnectionsList } from "@/features/infisical/hooks/use-infisical-connections"

// Radix Select items cannot use an empty value.
const NO_CONNECTION = "__none__"

/** Picks an Infisical connection; `""` means none. */
export function InfisicalConnectionSelect({
  id,
  value,
  onChange,
  allowNone = true,
  disabled,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  allowNone?: boolean
  disabled?: boolean
}) {
  const { t } = useTranslation("infisical")
  const { data: connections = [] } = useInfisicalConnectionsList()

  return (
    <Select
      value={value || NO_CONNECTION}
      onValueChange={(next) => {
        // Radix emits "" while options load; never a user choice.
        if (next === "") return
        onChange(next === NO_CONNECTION ? "" : next)
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allowNone ? (
          <SelectItem value={NO_CONNECTION}>{t("select.none")}</SelectItem>
        ) : null}
        {connections.map((connection) => (
          <SelectItem key={connection.id} value={connection.id}>
            {connection.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
