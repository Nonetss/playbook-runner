import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { StateCard } from "@/components/shared/data-display/state-card"
import { Button } from "@/components/ui/button"

export type QueryStateQuery<TData> = {
  data: TData | undefined
  isPending: boolean
  isError: boolean
  refetch: () => unknown
}

/** Shared pending → error → empty → content cascade for list and detail data. */
export function QueryState<TData>({
  query,
  loading,
  error,
  isEmpty,
  empty,
  fallback,
  children,
}: {
  query: QueryStateQuery<TData>
  loading: ReactNode
  error: {
    icon?: ReactNode
    title: ReactNode
    description?: ReactNode
    action?: ReactNode
  }
  isEmpty?: (data: TData) => boolean
  empty?: {
    icon?: ReactNode
    title: ReactNode
    description?: ReactNode
    action?: ReactNode
  }
  fallback?: ReactNode
  children: (data: TData) => ReactNode
}) {
  const { t } = useTranslation("common")

  if (query.isError) {
    return (
      <StateCard
        icon={error.icon}
        title={error.title}
        description={error.description}
        tone="destructive"
        action={
          error.action ?? (
            <Button variant="outline" onClick={() => query.refetch()}>
              {t("actions.retry")}
            </Button>
          )
        }
      />
    )
  }

  if (query.isPending) return fallback ?? <StateCard spinner title={loading} />

  const data = query.data as TData
  if (isEmpty?.(data) && empty) {
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
