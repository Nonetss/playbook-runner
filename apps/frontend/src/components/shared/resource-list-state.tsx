import { Plus, RotateCw } from "lucide-react"
import type * as React from "react"
import { useTranslation } from "react-i18next"
import { StateCard } from "@/components/shared/data-display/state-card"
import { Button } from "@/components/ui/button"

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
    ctaHref?: string
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
  const { t } = useTranslation("common")
  if (isPending) {
    return (
      <StateCard spinner title={t("actions.loading")} className={className} />
    )
  }

  if (isError) {
    return (
      <StateCard
        title={t("labels.error_loading_data")}
        tone="destructive"
        className={className}
        action={
          onRetry ? (
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
              <RotateCw className="size-3" />
              {t("actions.retry")}
            </Button>
          ) : undefined
        }
      />
    )
  }

  const list = items ?? []
  if (list.length === 0) {
    return (
      <StateCard
        icon={empty.icon}
        title={empty.title}
        description={empty.description}
        className={className}
        action={
          empty.ctaLabel && (empty.onCta || empty.ctaHref) ? (
            empty.ctaHref ? (
              <Button asChild className="mt-6">
                <a href={empty.ctaHref}>
                  <Plus className="size-4" />
                  {empty.ctaLabel}
                </a>
              </Button>
            ) : (
              <Button className="mt-6" onClick={empty.onCta}>
                <Plus className="size-4" />
                {empty.ctaLabel}
              </Button>
            )
          ) : undefined
        }
      />
    )
  }

  return <>{children([...list])}</>
}
