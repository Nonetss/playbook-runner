import {
  type AppSurface,
  appSections,
  appSurfaces,
  getSectionForPath,
  type SectionId,
  type SurfaceId,
} from "@/lib/app-surfaces"
import type { LucideIcon } from "@/lib/icon-registry"

export interface SiteNavSubItem {
  href: string
  labelKey: string
  descriptionKey: string
  icon: LucideIcon
}

export interface SiteNavItem extends SiteNavSubItem {
  /** Section id: every route of the section marks the item active. */
  section?: SectionId
  /** Kept visible at constrained desktop widths. */
  primary?: boolean
  subItems?: SiteNavSubItem[]
}

/** True when `pathname` is exactly `href` or a nested route under it. */
export function isNavLinkActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** A section is active when its own route or one of its declared subroutes is active. */
export function isNavItemActive(item: SiteNavItem, pathname: string) {
  if (item.section) return getSectionForPath(pathname) === item.section
  return (
    isNavLinkActive(item.href, pathname) ||
    item.subItems?.some((subItem) =>
      isNavLinkActive(subItem.href, pathname)
    ) === true
  )
}

function toNavLink(surface: AppSurface): SiteNavSubItem {
  return {
    href: surface.href,
    labelKey: surface.titleKey,
    descriptionKey: surface.descriptionKey,
    icon: surface.icon,
  }
}

/**
 * Navigation derives from the page-surface registry (`lib/app-surfaces.ts`),
 * never from a second list of labels and icons. Consumers resolve translation
 * keys so locale changes update every persisted React island.
 */
export const siteNavItems: SiteNavItem[] = (
  Object.keys(appSections) as SectionId[]
).map((section) => ({
  ...toNavLink(appSurfaces[section]),
  section,
  primary: true,
  subItems: appSections[section].map((id) => toNavLink(appSurfaces[id])),
}))

export function getSiteNavItemByHref(href: string) {
  return siteNavItems.find((item) => item.href === href)
}

/** A registered page as the navbar search lists it; keys resolve in `nav`. */
export interface SiteNavSearchItem {
  href: string
  labelKey: string
  descriptionKey: string
  icon: LucideIcon
  /** Title keys of the sections above the page, outermost first. */
  trailKeys: string[]
}

export interface SiteNavSearchGroup {
  headingKey: string
  items: SiteNavSearchItem[]
}

const GENERAL_SEARCH_GROUP_KEY = "search.groups.general"

function toSearchItem(
  surface: AppSurface,
  trailKeys: string[] = []
): SiteNavSearchItem {
  return {
    href: surface.href,
    labelKey: surface.titleKey,
    descriptionKey: surface.descriptionKey,
    icon: surface.icon,
    trailKeys,
  }
}

/**
 * Pages for the navbar search, projected from `app-surfaces`: the ones
 * outside every section share a leading "General" group, then each section
 * gets a group headed by its title, hub first and children in navigation
 * order.
 */
export function getSearchableSurfaces(): SiteNavSearchGroup[] {
  const sectionIds = Object.keys(appSections) as SectionId[]
  const inSection = new Set<string>([
    ...sectionIds,
    ...sectionIds.flatMap((section) => appSections[section]),
  ])

  const general: SiteNavSearchGroup = {
    headingKey: GENERAL_SEARCH_GROUP_KEY,
    items: (Object.keys(appSurfaces) as SurfaceId[])
      .filter((id) => !inSection.has(id))
      .map((id) => toSearchItem(appSurfaces[id])),
  }

  const sections = sectionIds.map((section): SiteNavSearchGroup => {
    const hub: AppSurface = appSurfaces[section]
    return {
      headingKey: hub.titleKey,
      items: [
        toSearchItem(hub),
        ...appSections[section].map((id) =>
          toSearchItem(appSurfaces[id], [hub.titleKey])
        ),
      ],
    }
  })

  return [general, ...sections]
}

/**
 * The most specific href that matches `pathname`, so the search marks
 * `/inventory/devices` — not also `/inventory` — as the current page.
 */
export function getCurrentSearchHref(
  pathname: string,
  hrefs: Iterable<string>
): string | undefined {
  let match: string | undefined
  for (const href of hrefs) {
    if (!isNavLinkActive(href, pathname)) continue
    if (!match || href.length > match.length) match = href
  }
  return match
}
