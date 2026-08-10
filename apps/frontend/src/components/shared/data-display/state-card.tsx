import { Loader2 } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Shared full-width state for loading, empty, errors, and completed actions. */
export function StateCard({
  icon,
  spinner = false,
  title,
  description,
  action,
  tone = "muted",
  className,
}: {
  icon?: ReactNode
  spinner?: boolean
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  tone?: "muted" | "destructive" | "celebrate"
  className?: string
}) {
  return (
    <div
      className={cn(
        "dash-enter relative flex flex-col items-center gap-3 overflow-hidden rounded-xl border border-dashed bg-card/40 px-6 py-16 text-center",
        tone === "celebrate" && "border-solid",
        className
      )}
    >
      {spinner ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : icon ? (
        <div
          className={cn(
            "dash-pop flex size-10 items-center justify-center text-muted-foreground",
            tone === "destructive" && "text-destructive",
            tone === "celebrate" && "text-primary"
          )}
        >
          {icon}
        </div>
      ) : null}
      <div>
        <p
          className={cn(
            "font-medium tracking-tight",
            tone === "celebrate" ? "text-lg" : "text-base",
            tone === "destructive" && "text-destructive"
          )}
        >
          {title}
        </p>
        {description ? (
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
