import { getIcon } from "@/lib/icon-registry"

const Loader2 = getIcon("status", "loading")

import type { ReactNode } from "react"
import { Text } from "@/components/shared/brand/typography"
import { SoftCardList } from "@/components/shared/data-display/soft-card-list"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

export type SelectableItem = {
  id: string
  name: string
  description?: string | null
  /** Technical detail rendered in the data role (e.g. an IP address). */
  meta?: ReactNode
}

/**
 * Checkbox list for assigning devices to groups (and back). One hairline
 * container, one row per option; the whole row toggles the checkbox.
 */
export function SelectableList({
  items,
  selectedIds,
  pendingId = null,
  disabled = false,
  onToggle,
  className,
}: {
  items: readonly SelectableItem[]
  selectedIds: ReadonlySet<string>
  pendingId?: string | null
  disabled?: boolean
  onToggle: (item: SelectableItem) => void
  className?: string
}) {
  return (
    <SoftCardList as="ul" className={className}>
      {items.map((item) => {
        const checked = selectedIds.has(item.id)
        const pending = pendingId === item.id
        const inputId = `selectable-${item.id}`
        return (
          <li key={item.id}>
            <label
              htmlFor={inputId}
              className={cn(
                "flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40",
                disabled && !pending && "cursor-not-allowed opacity-60"
              )}
            >
              {pending ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <Checkbox
                  id={inputId}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={() => onToggle(item)}
                />
              )}
              <span className="min-w-0 flex-1">
                <Text
                  as="span"
                  variant="body"
                  className="block truncate font-medium"
                >
                  {item.name}
                </Text>
                {item.description ? (
                  <Text
                    as="span"
                    variant="meta"
                    tone="muted"
                    className="block truncate"
                  >
                    {item.description}
                  </Text>
                ) : null}
              </span>
              {item.meta ? (
                <Text variant="data" tone="muted" className="shrink-0">
                  {item.meta}
                </Text>
              ) : null}
            </label>
          </li>
        )
      })}
    </SoftCardList>
  )
}
