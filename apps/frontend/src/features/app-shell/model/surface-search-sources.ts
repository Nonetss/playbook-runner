import type { UseQueryOptions } from "@tanstack/react-query"
import { ALL_GROUP_ID } from "@/features/inventory/all-group"
import type { SurfaceId } from "@/lib/app-surfaces"
import type { LucideIcon } from "@/lib/icon-registry"
import { orpc } from "@/lib/orpc"

/** A navbar search result with its texts already translated. */
export interface SurfaceSearchResult {
  href: string
  label: string
  description: string
  icon: LucideIcon
  /** Heading of the group it is listed under, matched like its own text. */
  section: string
  /** Section titles shown before the label (`Ansible › Playbooks`). */
  trail: string[]
}

export interface SurfaceSearchResultGroup {
  heading: string
  items: SurfaceSearchResult[]
}

/** One record a search source lists. */
export interface SurfaceSearchEntry {
  id: string
  label: string
  description?: string
}

type SearchQueryOptions<TData> = (options: {
  enabled: boolean
}) => UseQueryOptions<TData, Error, SurfaceSearchEntry[]>

export interface SurfaceSearchSource {
  /**
   * Page that lists these records: gives the results their icon, trail
   * (its section and its own title) and fallback description.
   */
  surface: SurfaceId
  /** `nav` key of the group heading. */
  headingKey: string
  /** Page a record opens. */
  href: (id: string) => string
  /**
   * The list page's own query (same key, so same cache and invalidation)
   * with a `select` that maps its rows to entries.
   */
  queryOptions: SearchQueryOptions<unknown>
}

/**
 * Erases the source's row type: consumers only read the selected entries,
 * and `select` stays type-checked against the procedure's output here.
 */
function defineSearchSource<TData>(
  source: Omit<SurfaceSearchSource, "queryOptions"> & {
    queryOptions: SearchQueryOptions<TData>
  }
): SurfaceSearchSource {
  return source as SurfaceSearchSource
}

function toEntries(
  rows: { id: string; name: string; description: string | null }[]
): SurfaceSearchEntry[] {
  return rows.map((row) => ({
    id: row.id,
    label: row.name,
    description: row.description ?? undefined,
  }))
}

const segment = encodeURIComponent

/**
 * Record types the navbar search lists once the user types, each loaded
 * through the procedure its list page already calls. A new record type is
 * one entry here: its listing page, heading, detail href and query.
 */
export const surfaceSearchSources: SurfaceSearchSource[] = [
  defineSearchSource({
    surface: "playbooks",
    headingKey: "search.groups.playbooks",
    href: (id) => `/playbooks/${segment(id)}/edit`,
    queryOptions: ({ enabled }) =>
      orpc.playbooks.list.queryOptions({ enabled, select: toEntries }),
  }),
  defineSearchSource({
    surface: "scheduler",
    headingKey: "search.groups.jobs",
    href: (id) => `/jobs/${segment(id)}`,
    queryOptions: ({ enabled }) =>
      orpc.jobs.list.queryOptions({ enabled, select: toEntries }),
  }),
  defineSearchSource({
    surface: "scripts",
    headingKey: "search.groups.scripts",
    href: (id) => `/scripts/${segment(id)}/edit`,
    queryOptions: ({ enabled }) =>
      orpc.scripts.list.queryOptions({ enabled, select: toEntries }),
  }),
  defineSearchSource({
    surface: "groups",
    headingKey: "search.groups.groups",
    href: (id) => `/inventory/${segment(id)}/group`,
    queryOptions: ({ enabled }) =>
      orpc.inventory.groups.list.queryOptions({
        enabled,
        // The built-in All group has no row; it falls back to the groups
        // page's description.
        select: (rows) => [
          { id: ALL_GROUP_ID, label: "All" },
          ...toEntries(rows),
        ],
      }),
  }),
]
