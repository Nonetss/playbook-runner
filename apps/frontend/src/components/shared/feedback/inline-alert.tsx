import { getIcon } from "@/lib/icon-registry"

const AlertTriangle = getIcon("status", "alert")

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Inline notice inside a page or form (a save error, a warning about the
 * current input). Hairline frame, no fill: `destructive` for errors and
 * risks, `muted` for neutral notes.
 */
export function InlineAlert({
  tone = "destructive",
  title,
  children,
  action,
  className,
}: {
  tone?: "destructive" | "muted"
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      role={tone === "destructive" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        tone === "destructive"
          ? "border-destructive/30 text-destructive"
          : "bg-card/40 text-muted-foreground",
        className
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="leading-relaxed">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
