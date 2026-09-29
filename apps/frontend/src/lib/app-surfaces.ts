import type { LucideIcon } from "@/lib/icon-registry"
import { getIcon } from "@/lib/icon-registry"

/**
 * Single registry of page identity. The navbar, section sidebar, document
 * `<title>`, `PageHero` and section overview cards all read from here, so a
 * page's title, description and icon are declared exactly once. Keys resolve
 * in the `nav` i18n namespace.
 */
export interface AppSurface {
  href: string
  titleKey: string
  descriptionKey: string
  icon: LucideIcon
}

export const appSurfaces = {
  dashboard: {
    href: "/",
    titleKey: "links.home",
    descriptionKey: "descriptions.home",
    icon: getIcon("views", "activity"),
  },
  inventory: {
    href: "/inventory",
    titleKey: "links.inventory",
    descriptionKey: "descriptions.inventory",
    icon: getIcon("resources", "server"),
  },
  devices: {
    href: "/inventory/devices",
    titleKey: "links.devices",
    descriptionKey: "descriptions.devices",
    icon: getIcon("resources", "device"),
  },
  groups: {
    href: "/inventory/groups",
    titleKey: "links.groups",
    descriptionKey: "descriptions.groups",
    icon: getIcon("resources", "folder"),
  },
  credentials: {
    href: "/inventory/credentials",
    titleKey: "links.credentials",
    descriptionKey: "descriptions.credentials",
    icon: getIcon("resources", "apiKey"),
  },
  ansible: {
    href: "/ansible",
    titleKey: "links.ansible",
    descriptionKey: "descriptions.ansible",
    icon: getIcon("resources", "workflow"),
  },
  bash: {
    href: "/bash",
    titleKey: "links.bash",
    descriptionKey: "descriptions.bash",
    icon: getIcon("resources", "terminalSquare"),
  },
  playbooks: {
    href: "/playbooks",
    titleKey: "links.playbooks",
    descriptionKey: "descriptions.playbooks",
    icon: getIcon("resources", "book"),
  },
  scripts: {
    href: "/scripts",
    titleKey: "links.scripts",
    descriptionKey: "descriptions.scripts",
    icon: getIcon("resources", "fileCode"),
  },
  commands: {
    href: "/commands",
    titleKey: "links.commands",
    descriptionKey: "descriptions.commands",
    icon: getIcon("resources", "terminal"),
  },
  scheduler: {
    href: "/jobs/scheduler",
    titleKey: "links.scheduler",
    descriptionKey: "descriptions.scheduler",
    icon: getIcon("scheduling", "schedule"),
  },
  history: {
    href: "/jobs/history",
    titleKey: "links.history",
    descriptionKey: "descriptions.history",
    icon: getIcon("resources", "history"),
  },
  config: {
    href: "/config",
    titleKey: "links.config",
    descriptionKey: "descriptions.config",
    icon: getIcon("actions", "settings"),
  },
  adminUsers: {
    href: "/admin/users",
    titleKey: "links.admin_users",
    descriptionKey: "descriptions.admin_users",
    icon: getIcon("resources", "users"),
  },
  me: {
    href: "/me",
    titleKey: "links.me",
    descriptionKey: "descriptions.me",
    icon: getIcon("identity", "userCircle"),
  },
} as const satisfies Record<string, AppSurface>

export type SurfaceId = keyof typeof appSurfaces

/** Navigation sections: each renders the persistent section sidebar. */
export const appSections = {
  inventory: ["devices", "groups", "credentials"],
  ansible: ["playbooks", "scheduler", "history"],
  bash: ["scripts", "commands"],
} as const satisfies Record<string, readonly SurfaceId[]>

/**
 * Extra route prefixes owned by a section beyond its overview and children
 * (job detail and form routes live under `/jobs/*`).
 */
const sectionPrefixes: Partial<Record<SectionId, readonly string[]>> = {
  ansible: ["/jobs"],
}

export type SectionId = keyof typeof appSections

export function getSurface(id: SurfaceId): AppSurface {
  return appSurfaces[id]
}

function matchesHref(href: string, pathname: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** The section owning `pathname` (its overview or any sub-surface route). */
export function getSectionForPath(pathname: string): SectionId | undefined {
  for (const [section, children] of Object.entries(appSections) as [
    SectionId,
    readonly SurfaceId[],
  ][]) {
    if (matchesHref(appSurfaces[section].href, pathname)) return section
    if (children.some((id) => matchesHref(appSurfaces[id].href, pathname))) {
      return section
    }
    if (sectionPrefixes[section]?.some((href) => matchesHref(href, pathname))) {
      return section
    }
  }
  return undefined
}
