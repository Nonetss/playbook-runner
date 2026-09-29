import {
  type AppSurface,
  appSections,
  appSurfaces,
  type SectionId,
} from "@/lib/app-surfaces"
import type { LucideIcon } from "@/lib/icon-registry"

export interface SiteNavSubItem {
  href: string
  labelKey: string
  descriptionKey: string
  icon: LucideIcon
}

export interface SiteNavItem extends SiteNavSubItem {
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
  primary: true,
  subItems: appSections[section].map((id) => toNavLink(appSurfaces[id])),
}))

export function getSiteNavItemByHref(href: string) {
  return siteNavItems.find((item) => item.href === href)
}
