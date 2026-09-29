import type { ComponentType, ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * A titled card inside a run console (one host, one task, the recap): a
 * raised header bar with icon, mono title and trailing meta, over a body the
 * caller lays out. Terminal tokens only, dark in both themes.
 */
export function TerminalPanel({
  icon: Icon,
  title,
  titleClassName,
  meta,
  children,
  className,
}: {
  icon: ComponentType<{ className?: string }>
  title: ReactNode
  titleClassName?: string
  /** Trailing header content, usually `TerminalPanelMeta` items. */
  meta?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-terminal-border bg-terminal-surface",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-terminal-border bg-terminal-raised px-3 py-1.5">
        <Icon className="size-3.5 shrink-0 text-terminal-subtle" />
        <span
          className={cn(
            "min-w-0 flex-1 truncate font-mono text-xs font-medium text-terminal-fg",
            titleClassName
          )}
        >
          {title}
        </span>
        {meta}
      </div>
      {children}
    </div>
  )
}

/** A small mono fact in a `TerminalPanel` header (counts, rc, status). */
export function TerminalPanelMeta({
  children,
  className,
}: {
  children: ReactNode
  /** A `RUN_HOST_STATUS` text class to tint it; subtle by default. */
  className?: string
}) {
  return (
    <span
      className={cn(
        "shrink-0 font-mono text-console-meta text-terminal-subtle",
        className
      )}
    >
      {children}
    </span>
  )
}
