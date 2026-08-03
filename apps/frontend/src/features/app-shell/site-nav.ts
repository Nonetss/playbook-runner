import {
  BriefcaseIcon,
  ClipboardListIcon,
  FileCode2,
  HistoryIcon,
  KeyRound,
  ServerIcon,
  TerminalIcon,
} from "lucide-react"
import type { ComponentType } from "react"

export type SiteNavIconComponent = ComponentType<{ className?: string }>

export interface SiteNavSubItem {
  href: string
  label: string
  description: string
  icon: SiteNavIconComponent
}

export interface SiteNavItem {
  href: string
  label: string
  description: string
  icon: SiteNavIconComponent
  /** Hidden from the navbar unless the user is an admin. */
  adminOnly?: boolean
  /** Subroutes of this section: navbar dropdown, etc. */
  subItems?: SiteNavSubItem[]
}

/** True when `pathname` is exactly `href` or a nested route under it. */
export function isNavLinkActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Single source of truth for site navigation: navbar (desktop + mobile),
 * section sidebars and section landing pages all read from here.
 */
export const siteNavItems: SiteNavItem[] = [
  {
    href: "/credentials",
    label: "Credentials",
    description: "Manage SSH credentials and keys",
    icon: KeyRound,
  },
  {
    href: "/inventory",
    label: "Inventory",
    description: "Manage hosts and groups",
    icon: ServerIcon,
  },
  {
    href: "/playbooks",
    label: "Playbooks",
    description: "View and manage Ansible playbooks",
    icon: FileCode2,
  },
  {
    href: "/scripts",
    label: "Scripts",
    description: "Manage custom scripts",
    icon: TerminalIcon,
  },
  {
    href: "/commands",
    label: "Commands",
    description: "Run ad-hoc commands",
    icon: ClipboardListIcon,
  },
  {
    href: "/jobs",
    label: "Jobs",
    description: "Automated playbook executions",
    icon: BriefcaseIcon,
  },
  {
    href: "/history",
    label: "History",
    description: "View all execution runs",
    icon: HistoryIcon,
  },
]

export function getSiteNavItemByHref(href: string) {
  return siteNavItems.find((item) => item.href === href)
}

/** Sections visible to the current user. */
export function getSiteNavItems(isAdmin: boolean) {
  return siteNavItems.filter((item) => !item.adminOnly || isAdmin)
}
