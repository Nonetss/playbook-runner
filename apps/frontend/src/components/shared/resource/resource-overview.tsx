import type { ComponentProps, ReactNode } from "react"
import {
  QueryState,
  type QueryStateQuery,
  type StateCardDefinition,
} from "@/components/shared/feedback/query-state"
import { PageHero } from "@/components/shared/layout/page-hero"
import { PageShell } from "@/components/shared/layout/page-shell"
import type { SurfaceId } from "@/lib/app-surfaces"

/**
 * The resource-page stack: `PageShell` + registry-driven `PageHero` +
 * optional filters + the `QueryState` cascade. Named slots only; `children`
 * renders the query's success state and never rebuilds the shell.
 */
export function ResourceOverview<TData>({
  surface,
  icon,
  title,
  description,
  heroMeta,
  heroStatus,
  heroAction,
  heroChildren,
  filters,
  query,
  loading,
  error,
  isEmpty,
  empty,
  hasActiveFilters,
  filteredEmpty,
  children,
  footer,
  maxWidth = "6xl",
}: {
  surface: SurfaceId
  /** Overrides the surface icon (e.g. an open folder). */
  icon?: ReactNode
  title?: ReactNode
  description?: ReactNode
  heroMeta?: ReactNode
  heroStatus?: ReactNode
  heroAction?: ReactNode
  heroChildren?: ReactNode
  filters?: ReactNode
  query: QueryStateQuery<TData>
  loading?: ReactNode
  error?: StateCardDefinition
  isEmpty?: (data: TData) => boolean
  empty?: StateCardDefinition
  hasActiveFilters?: boolean
  filteredEmpty?: Partial<StateCardDefinition> & { onClear?: () => void }
  children: (data: TData) => ReactNode
  footer?: ReactNode
  maxWidth?: ComponentProps<typeof PageShell>["maxWidth"]
}) {
  return (
    <PageShell maxWidth={maxWidth}>
      <PageHero
        surface={surface}
        icon={icon}
        title={title}
        description={description}
        meta={heroMeta}
        status={heroStatus}
        action={heroAction}
      >
        {heroChildren}
      </PageHero>
      {filters}
      <QueryState
        query={query}
        loading={loading}
        error={error}
        isEmpty={isEmpty}
        empty={empty}
        hasActiveFilters={hasActiveFilters}
        filteredEmpty={filteredEmpty}
      >
        {children}
      </QueryState>
      {footer}
    </PageShell>
  )
}
