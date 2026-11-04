import { useState } from "react"
import { useTranslation } from "react-i18next"
import { dataFieldClass, Text } from "@/components/shared/brand/typography"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { selectTriggerClass } from "@/components/ui/select"
import { useInfisicalSecretNames } from "@/features/infisical/hooks/use-infisical-connections"
import { matchesEveryWord } from "@/lib/fold-text"
import { getIcon } from "@/lib/icon-registry"
import { cn } from "@/lib/utils"

const CheckIcon = getIcon("controls", "checkIcon")
const ChevronDownIcon = getIcon("controls", "downIcon")

/** Binary score, so cmdk keeps the order Infisical returned the names in. */
function matchSecret(value: string, search: string) {
  return matchesEveryWord(search, [value]) ? 1 : 0
}

/**
 * Picks a secret by name, from the root of the environment unless the variable
 * was stored with another path, which it keeps. It only ever handles names:
 * values never reach the browser. A secret no longer listed stays selected.
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
  const [open, setOpen] = useState(false)
  const path = secretPath.trim() || "/"
  const {
    data: names = [],
    isLoading,
    isError,
    error,
  } = useInfisicalSecretNames(connectionId, environment, path)
  const isListed = names.includes(secretName)
  const choose = (next: string) => {
    onChange({ secretName: next, secretPath })
    setOpen(false)
  }

  return (
    <div className="min-w-0 space-y-1">
      {/* Modal, like a Select: inside a dialog the list would not scroll
          otherwise, because the dialog locks scrolling outside its content. */}
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger
          aria-label={t("variables.secret_aria", { n: index })}
          data-size="default"
          data-placeholder={secretName ? undefined : ""}
          disabled={disabled}
          className={cn(
            selectTriggerClass,
            dataFieldClass,
            "h-9 w-full min-w-0"
          )}
        >
          <span data-slot="select-value" className="min-w-0 truncate">
            {secretName
              ? isListed || isLoading
                ? secretName
                : t("variables.secret_not_listed", { name: secretName })
              : t("variables.secret_placeholder")}
          </span>
          <ChevronDownIcon className="size-4 opacity-50" aria-hidden />
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 max-w-[calc(100vw-2rem)] p-0">
          <Command filter={matchSecret} defaultValue={secretName}>
            <CommandInput
              aria-label={t("variables.secret_search_aria", { n: index })}
              placeholder={t("variables.secret_search_placeholder")}
            />
            <CommandList className="max-h-[min(16rem,40dvh)]">
              <CommandEmpty>
                {isLoading
                  ? t("variables.secret_search_loading")
                  : t("variables.secret_search_empty")}
              </CommandEmpty>
              <CommandGroup>
                {secretName && !isListed && !isLoading ? (
                  <SecretOption
                    value={secretName}
                    label={t("variables.secret_not_listed", {
                      name: secretName,
                    })}
                    selected
                    onSelect={choose}
                  />
                ) : null}
                {names.map((name) => (
                  <SecretOption
                    key={name}
                    value={name}
                    label={name}
                    selected={name === secretName}
                    onSelect={choose}
                  />
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {isError ? (
        <Text as="p" variant="meta" className="text-destructive">
          {t("variables.list_error", { message: error.message })}
        </Text>
      ) : null}
    </div>
  )
}

function SecretOption({
  value,
  label,
  selected,
  onSelect,
}: {
  value: string
  label: string
  selected: boolean
  onSelect: (value: string) => void
}) {
  return (
    <CommandItem
      value={value}
      onSelect={() => onSelect(value)}
      className="pr-8 font-mono break-all pointer-coarse:py-2.5"
    >
      {label}
      {selected ? (
        <CheckIcon className="absolute right-2 size-4" aria-hidden />
      ) : null}
    </CommandItem>
  )
}
