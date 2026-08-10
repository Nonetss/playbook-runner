import {
  BookText,
  BriefcaseBusiness,
  CalendarClock,
  FileCode2,
  Folder,
  History,
  KeyRound,
  type LucideIcon,
  Server,
  Terminal,
} from "lucide-react"

export interface SiteNavSubItem {
  href: string
  labelKey: string
  descriptionKey: string
  icon: LucideIcon
}

export interface SiteNavItem {
  href: string
  labelKey: string
  descriptionKey: string
  icon: LucideIcon
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

/**
 * Navigation structure, labels, descriptions and icons all derive from this
 * one source. Consumers resolve translation keys so locale changes update
 * every persisted React island without an Astro prop round-trip.
 */
export const siteNavItems: SiteNavItem[] = [
  {
    href: "/credentials",
    labelKey: "links.credentials",
    descriptionKey: "descriptions.credentials",
    icon: KeyRound,
    primary: true,
  },
  {
    href: "/inventory",
    labelKey: "links.inventory",
    descriptionKey: "descriptions.inventory",
    icon: Server,
    primary: true,
    subItems: [
      {
        href: "/inventory/devices",
        labelKey: "links.devices",
        descriptionKey: "descriptions.devices",
        icon: Server,
      },
      {
        href: "/inventory/groups",
        labelKey: "links.groups",
        descriptionKey: "descriptions.groups",
        icon: Folder,
      },
    ],
  },
  {
    href: "/playbooks",
    labelKey: "links.playbooks",
    descriptionKey: "descriptions.playbooks",
    icon: BookText,
    primary: true,
  },
  {
    href: "/scripts",
    labelKey: "links.scripts",
    descriptionKey: "descriptions.scripts",
    icon: FileCode2,
  },
  {
    href: "/commands",
    labelKey: "links.commands",
    descriptionKey: "descriptions.commands",
    icon: Terminal,
  },
  {
    href: "/jobs",
    labelKey: "links.jobs",
    descriptionKey: "descriptions.jobs",
    icon: BriefcaseBusiness,
    primary: true,
    subItems: [
      {
        href: "/jobs/scheduler",
        labelKey: "links.scheduler",
        descriptionKey: "descriptions.scheduler",
        icon: CalendarClock,
      },
      {
        href: "/jobs/history",
        labelKey: "links.history",
        descriptionKey: "descriptions.history",
        icon: History,
      },
    ],
  },
]

export function getSiteNavItemByHref(href: string) {
  return siteNavItems.find((item) => item.href === href)
}
