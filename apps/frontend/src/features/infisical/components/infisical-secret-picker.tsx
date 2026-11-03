import { useTranslation } from "react-i18next"
import { dataFieldClass, Text } from "@/components/shared/brand/typography"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useInfisicalSecretNames } from "@/features/infisical/hooks/use-infisical-connections"
import { cn } from "@/lib/utils"

/**
 * Picks a secret by path and name. It only ever handles names: values never
 * reach the browser. A secret that is no longer listed stays selected.
 */
export function InfisicalSecretPicker({
  connectionId,
  environment,
  secretName,
  secretPath,
  onChange,
  index,
  disabled,
}: {
  connectionId: string
  environment: string
  secretName: string
  secretPath: string
  onChange: (next: { secretName: string; secretPath: string }) => void
  /** 1-based row number, for the accessible names. */
  index: number
  disabled?: boolean
}) {
  const { t } = useTranslation("infisical")
  const path = secretPath.trim() || "/"
  const {
    data: names = [],
    isError,
    error,
  } = useInfisicalSecretNames(connectionId, environment, path)
  const isListed = names.includes(secretName)

  return (
    <div className="min-w-0 space-y-1">
      <div className="flex min-w-0 items-center gap-1.5">
        <Input
          aria-label={t("variables.path_aria", { n: index })}
          placeholder="/"
          value={secretPath}
          onChange={(e) => onChange({ secretName, secretPath: e.target.value })}
          disabled={disabled}
          className={cn(dataFieldClass, "h-9 w-20 shrink-0")}
        />
        <Select
          value={secretName}
          onValueChange={(next) => {
            // Radix emits "" while options load; never a user choice.
            if (next !== "") onChange({ secretName: next, secretPath })
          }}
          disabled={disabled}
        >
          <SelectTrigger
            aria-label={t("variables.secret_aria", { n: index })}
            className={cn(dataFieldClass, "h-9 w-full min-w-0 flex-1")}
          >
            <SelectValue placeholder={t("variables.secret_placeholder")} />
          </SelectTrigger>
          <SelectContent>
            {secretName && !isListed ? (
              <SelectItem value={secretName}>
                {t("variables.secret_not_listed", { name: secretName })}
              </SelectItem>
            ) : null}
            {names.map((name) => (
              <SelectItem key={name} value={name} className="font-mono">
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isError ? (
        <Text as="p" variant="meta" className="text-destructive">
          {t("variables.list_error", { message: error.message })}
        </Text>
      ) : null}
    </div>
  )
}
