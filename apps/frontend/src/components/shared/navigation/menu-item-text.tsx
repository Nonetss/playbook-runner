import type { ReactNode } from "react"
import { Text } from "@/components/shared/brand/typography"

export interface MenuItemTextProps {
  /** Item name; inherits the row's color so active and hover states reach it. */
  label: ReactNode
  /** One- or two-line explanation under the name, clamped to two lines. */
  description?: ReactNode
}

/**
 * The text column of a rich menu row: a compact medium-weight label over a
 * muted, two-line-clamped description. It sits next to the row's icon inside a
 * navigation-menu link; the row itself owns padding, icon, hover and active
 * styling.
 */
export function MenuItemText({ label, description }: MenuItemTextProps) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <Text variant="compact" className="font-medium leading-tight">
        {label}
      </Text>
      {description ? (
        <Text
          variant="compact"
          tone="muted"
          className="line-clamp-2 leading-snug"
        >
          {description}
        </Text>
      ) : null}
    </span>
  )
}
