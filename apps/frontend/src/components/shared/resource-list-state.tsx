"use client"

import { Loader2, Plus, RotateCw } from "lucide-react"
import type * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ResourceListStateProps<TItem> {
  isPending?: boolean
  isError?: boolean
  onRetry?: () => void
  items?: ReadonlyArray<TItem>
  empty: {
    title: string
    description?: string
    ctaLabel?: string
    onCta?: () => void
    icon?: React.ReactNode
  }
  children: (items: TItem[]) => React.ReactNode
  className?: string
}

/**
 * Uniform loading / error / empty wrapper for every resource list. Renders
 * the corresponding state and falls through to `children(items)` when there
 * is data.
 */
export function ResourceListState<TItem>({
  isPending = false,
  isError = false,
  onRetry,
  items,
  empty,
  children,
  className,
}: ResourceListStateProps<TItem>) {
  if (isPending) {
    return (
      <div
        className={cn(
          "text-muted-foreground flex items-center gap-2 py-6 text-sm",
          className
        )}
      >
        <Loader2 className="size-4 animate-spin" />
        Cargando...
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className={cn(
          "rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive",
          className
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <span>No se pudieron cargar los datos.</span>
          {onRetry ? (
            <Button type="button" size="xs" variant="outline" onClick={onRetry}>
              <RotateCw className="size-3" />
              Reintentar
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  const list = items ?? []
  if (list.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed bg-card px-6 py-12 text-center",
          className
        )}
      >
        {empty.icon ? (
          <div className="bg-primary/10 text-primary mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
            {empty.icon}
          </div>
        ) : null}
        <h2 className="text-lg font-semibold">{empty.title}</h2>
        {empty.description ? (
          <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm">
            {empty.description}
          </p>
        ) : null}
        {empty.ctaLabel && empty.onCta ? (
          <Button className="mt-6" onClick={empty.onCta}>
            <Plus className="size-4" />
            {empty.ctaLabel}
          </Button>
        ) : null}
      </div>
    )
  }

  return <>{children([...list])}</>
}
