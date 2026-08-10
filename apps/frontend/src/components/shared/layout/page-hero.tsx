import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Consistent resource header with a deliberately small operational footprint. */
export function PageHero({
  icon,
  title,
  description,
  meta,
  status,
  action,
  children,
  className,
}: {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  meta?: ReactNode
  status?: ReactNode
  action?: ReactNode
  children?: ReactNode
  className?: string
}) {
  const hasAside = Boolean(meta || status || action)

  return (
    <header className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon ? (
            <div className="flex size-5 shrink-0 items-center justify-center text-primary">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {hasAside ? (
          <div className="flex w-full shrink-0 flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
            {meta}
            {status}
            {action}
          </div>
        ) : null}
      </div>
      {children ? <div className="w-full">{children}</div> : null}
    </header>
  )
}
