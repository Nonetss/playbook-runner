export interface SiteNavItem {
  href: string
  /** Translation key inside the `nav` namespace's `links` object. */
  labelKey: string
}

/** True when `pathname` is exactly `href` or a nested route under it. */
export function isNavLinkActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Single source of truth for site navigation: navbar (desktop + mobile)
 * reads from here. Labels are translation keys, resolved via
 * `useTranslation("nav")` in each consumer so switching language updates
 * them live.
 */
export const siteNavItems: SiteNavItem[] = [
  { href: "/credentials", labelKey: "links.credentials" },
  { href: "/inventory", labelKey: "links.inventory" },
  { href: "/playbooks", labelKey: "links.playbooks" },
  { href: "/scripts", labelKey: "links.scripts" },
  { href: "/commands", labelKey: "links.commands" },
  { href: "/jobs", labelKey: "links.jobs" },
  { href: "/history", labelKey: "links.history" },
]
