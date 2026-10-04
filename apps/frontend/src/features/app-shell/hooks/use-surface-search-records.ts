import { useQueries } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import {
  type SurfaceSearchResultGroup,
  surfaceSearchSources,
} from "@/features/app-shell/model/surface-search-sources"
import {
  appSections,
  appSurfaces,
  type SectionId,
  type SurfaceId,
} from "@/lib/app-surfaces"

/** Title keys of the section owning `surface` (if any) and of `surface`. */
function getTrailKeys(surface: SurfaceId): string[] {
  const section = (Object.keys(appSections) as SectionId[]).find((id) =>
    (appSections[id] as readonly SurfaceId[]).includes(surface)
  )
  return [
    ...(section ? [appSurfaces[section].titleKey] : []),
    appSurfaces[surface].titleKey,
  ]
}

/**
 * Records the navbar search lists (playbooks, jobs, scripts, groups), one
 * group per source with translated texts. Each source reuses its list page's
 * query (shared cache, so an already loaded list costs no request) and runs
 * only while `enabled`, i.e. while the dialog is open. A source that is still
 * loading or failed yields no group, so the page results never wait on it.
 */
export function useSurfaceSearchRecords({
  enabled,
}: {
  enabled: boolean
}): SurfaceSearchResultGroup[] {
  const { t } = useTranslation("nav")
  const results = useQueries({
    queries: surfaceSearchSources.map((source) =>
      source.queryOptions({ enabled })
    ),
  })

  return surfaceSearchSources.flatMap((source, index) => {
    const entries = results[index]?.data
    if (!entries?.length) return []
    const surface = appSurfaces[source.surface]
    const heading = t(source.headingKey)
    const trail = getTrailKeys(source.surface).map((key) => t(key))
    const fallbackDescription = t(surface.descriptionKey)
    return [
      {
        heading,
        items: entries.map((entry) => ({
          href: source.href(entry.id),
          label: entry.label,
          description: entry.description ?? fallbackDescription,
          icon: surface.icon,
          section: heading,
          trail,
        })),
      },
    ]
  })
}
