import type { ReactNode } from "react"
import { Text } from "@/components/shared/brand/typography"
import { cn } from "@/lib/utils"

/** Label-role caps over a body-role value. */
export function MetadataCell({
  label,
  children,
  action,
  tone = "default",
  className,
}: {
  label: string
  children: ReactNode
  /** Inline affordance on the value row, e.g. a copy button. */
  action?: ReactNode
  tone?: "default" | "destructive"
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <Text as="p" variant="label" tone="muted" className="truncate">
        {label}
      </Text>
      <Text
        as="div"
        variant="body"
        className={cn(
          "mt-1.5 truncate",
          tone === "destructive" && "text-destructive",
          action && "flex min-w-0 items-center gap-1"
        )}
      >
        {children}
        {action}
      </Text>
    </div>
  )
}

/** Hairline-framed grid of `MetadataCell` fact rows. */
export function MetadataList({
  columns,
  bordered = true,
  children,
  className,
}: {
  columns: 1 | 2 | 3 | 4
  bordered?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid gap-x-6 gap-y-5 py-5",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-3",
        columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        bordered && "border-y",
        className
      )}
    >
      {children}
    </div>
  )
}
