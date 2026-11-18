import type * as React from "react"
import { cn } from "@/lib/utils"

/** A keyboard key or shortcut (`⌘K`, `esc`, `↵`) drawn as a small keycap. */
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-label font-medium text-muted-foreground select-none",
        className
      )}
      {...props}
    />
  )
}

/** Keys pressed together or listed side by side (`↑ ↓`). */
function KbdGroup({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
