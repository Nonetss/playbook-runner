import { getIcon } from "@/lib/icon-registry"

const FilterX = getIcon("views", "clearFilters")

import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { StateCard } from "@/components/shared/feedback/state-card"
import { Button } from "@/components/ui/button"

export type QueryStateQuery<TData> = {
  data: TData | undefined
  isPending: boolean
  isError: boolean
  refetch: () => unknown
}

export interface StateCardDefinition {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}

/**
 * Shared error → pending → filtered-empty → empty → success cascade over
 * `StateCard`. `data` should already be the filtered view when
 * `hasActiveFilters` is set.
 */
export function QueryState<TData>({
  query,
  loading,
  error,
  isEmpty,
  empty,
  hasActiveFilters = false,
  filteredEmpty,
  children,
}: {
  query: QueryStateQuery<TData>
  loading?: ReactNode
  error?: StateCardDefinition
  isEmpty?: (data: TData) => boolean
  empty?: StateCardDefinition
  hasActiveFilters?: boolean
  filteredEmpty?: Partial<StateCardDefinition> & { onClear?: () => void }
  children: (data: TData) => ReactNode
}) {
  const { t } = useTranslation("common")

  if (query.isError) {
    return (
      <StateCard
        icon={error?.icon}
        title={error?.title ?? t("labels.error_loading_data")}
        description={error?.description}
        tone="destructive"
        action={
          error?.action ?? (
            <Button variant="outline" onClick={() => query.refetch()}>
              {t("actions.retry")}
            </Button>
          )
        }
      />
    )
  }

  if (query.isPending) {
    return <StateCard spinner title={loading ?? t("actions.loading")} />
  }

  const data = query.data as TData
  const dataIsEmpty = isEmpty?.(data) ?? false

  if (dataIsEmpty && hasActiveFilters) {
    return (
      <StateCard
        icon={filteredEmpty?.icon}
        title={filteredEmpty?.title ?? t("labels.no_results")}
        description={
          filteredEmpty?.description ?? t("labels.no_results_description")
        }
        action={
          filteredEmpty?.action ??
          (filteredEmpty?.onClear ? (
            <Button variant="outline" onClick={filteredEmpty.onClear}>
              <FilterX className="size-4" />
              {t("actions.clear_filters")}
            </Button>
          ) : undefined)
        }
      />
    )
  }

  if (dataIsEmpty && empty) {
    return (
      <StateCard
        icon={empty.icon}
        title={empty.title}
        description={empty.description}
        action={empty.action}
      />
    )
  }

  return <>{children(data)}</>
}
