import { useQueryClient } from "@tanstack/react-query"
import type { Session, User } from "better-auth"
import { getIcon } from "@/lib/icon-registry"

const ChevronDown = getIcon("controls", "expand")

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { StatusDot } from "@/components/shared/data-display/status-dot"
import { AppLink } from "@/components/ui/app-link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AppLogo } from "@/features/app-shell/components/app-logo"
import { LanguageSwitcher } from "@/features/app-shell/components/language-switcher"
import { NavbarMobileMenu } from "@/features/app-shell/components/navbar-mobile-menu"
import { SettingsLink } from "@/features/app-shell/components/settings-link"
import { ThemeToggle } from "@/features/app-shell/components/theme-toggle"
import { UserNav } from "@/features/app-shell/components/user-nav"
import {
  isNavItemActive,
  isNavLinkActive,
  type SiteNavItem,
  siteNavItems,
} from "@/features/app-shell/site-nav"
import { useScrolled } from "@/hooks/use-scrolled"
import { orpc } from "@/lib/orpc"
import { cn } from "@/lib/utils"

export interface NavbarAuthenticatedProps {
  user: User
  session: Session
  nameApp: string
  currentPath: string
  locale: string
}

const pillBase =
  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium outline-none transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-ring/50"
const pillInactive =
  "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
const pillActive = "bg-primary/10 text-primary"

function prefetchForHref(
  queryClient: ReturnType<typeof useQueryClient>,
  href: string
) {
  switch (href) {
    case "/inventory":
      queryClient.prefetchQuery(orpc.inventory.devices.list.queryOptions())
      queryClient.prefetchQuery(orpc.inventory.groups.list.queryOptions())
      return
    case "/inventory/credentials":
      queryClient.prefetchQuery(orpc.credentials.list.queryOptions())
      return
    case "/playbooks":
      queryClient.prefetchQuery(orpc.playbooks.list.queryOptions())
      return
    case "/scripts":
      queryClient.prefetchQuery(orpc.scripts.list.queryOptions())
      return
    case "/jobs":
    case "/jobs/scheduler":
      queryClient.prefetchQuery(orpc.jobs.list.queryOptions())
      return
    case "/history":
    case "/jobs/history":
      queryClient.prefetchQuery(
        orpc.jobs.runs.listAll.queryOptions({ input: { limit: 25 } })
      )
      return
    case "/config":
      queryClient.prefetchQuery(orpc.config.apiKeys.list.queryOptions())
  }
}

function NavDropdown({
  item,
  currentPath,
  onIntent,
}: {
  item: SiteNavItem
  currentPath: string
  onIntent: (href: string) => () => void
}) {
  const { t } = useTranslation("nav")
  const [open, setOpen] = useState(false)
  const active = isNavItemActive(item, currentPath)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-current={active ? "page" : undefined}
          className={cn(pillBase, active ? pillActive : pillInactive)}
          onMouseEnter={onIntent(item.href)}
          onFocus={onIntent(item.href)}
        >
          {t(item.labelKey)}
          {active ? <StatusDot tone="primary" /> : null}
          <ChevronDown
            aria-hidden
            className={cn(
              "size-3 opacity-60 transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        sideOffset={8}
        className="min-w-60 rounded-xl bg-popover/95 p-1 shadow-md"
      >
        <DropdownMenuItem asChild>
          <AppLink
            href={item.href}
            onMouseEnter={onIntent(item.href)}
            onFocus={onIntent(item.href)}
            className="flex min-h-11 items-center gap-2.5 rounded-lg bg-muted/40 px-2.5 py-2 text-foreground outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60"
          >
            <item.icon aria-hidden className="size-3.5 shrink-0 text-primary" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-xs font-medium leading-tight">
                {t(item.labelKey)}
              </span>
              <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                {t(item.descriptionKey)}
              </span>
            </span>
          </AppLink>
        </DropdownMenuItem>
        <div className="my-1 border-t" />
        {item.subItems?.map((subItem) => (
          <DropdownMenuItem key={subItem.href} asChild>
            <AppLink
              href={subItem.href}
              aria-current={
                isNavLinkActive(subItem.href, currentPath) ? "page" : undefined
              }
              onMouseEnter={onIntent(subItem.href)}
              onFocus={onIntent(subItem.href)}
              className="flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 py-2 text-foreground/80 outline-none transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:bg-muted/60 focus-visible:text-foreground data-[current=page]:bg-muted/60 data-[current=page]:text-foreground"
            >
              <subItem.icon
                aria-hidden
                className="size-3.5 shrink-0 text-primary"
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-xs font-medium leading-tight">
                  {t(subItem.labelKey)}
                </span>
                <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                  {t(subItem.descriptionKey)}
                </span>
              </span>
            </AppLink>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NavPill({
  item,
  currentPath,
  onIntent,
}: {
  item: SiteNavItem
  currentPath: string
  onIntent: (href: string) => () => void
}) {
  const { t } = useTranslation("nav")
  if (item.subItems?.length) {
    return (
      <NavDropdown item={item} currentPath={currentPath} onIntent={onIntent} />
    )
  }

  const active = isNavItemActive(item, currentPath)
  return (
    <AppLink
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(pillBase, active ? pillActive : pillInactive)}
      onMouseEnter={onIntent(item.href)}
      onFocus={onIntent(item.href)}
    >
      {t(item.labelKey)}
      {active ? <StatusDot tone="primary" /> : null}
    </AppLink>
  )
}

function OverflowMenu({
  items,
  currentPath,
  onIntent,
}: {
  items: SiteNavItem[]
  currentPath: string
  onIntent: (href: string) => () => void
}) {
  const { t } = useTranslation("nav")
  const [open, setOpen] = useState(false)
  if (!items.length) return null

  return (
    <li className="hidden lg:block xl:hidden">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("actions.more")}
            className={cn(pillBase, pillInactive)}
          >
            {t("actions.more")}
            <ChevronDown
              aria-hidden
              className={cn(
                "size-3 opacity-60 transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          sideOffset={8}
          className="min-w-60 rounded-xl bg-popover/95 p-1 shadow-md"
        >
          {items.map((item) => (
            <DropdownMenuItem key={item.href} asChild>
              <AppLink
                href={item.href}
                aria-current={
                  isNavItemActive(item, currentPath) ? "page" : undefined
                }
                onMouseEnter={onIntent(item.href)}
                onFocus={onIntent(item.href)}
                className="flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 py-2 text-foreground/80 outline-none transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:bg-muted/60 focus-visible:text-foreground data-[current=page]:bg-muted/60 data-[current=page]:text-foreground"
              >
                <item.icon
                  aria-hidden
                  className="size-3.5 shrink-0 text-primary"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-xs font-medium leading-tight">
                    {t(item.labelKey)}
                  </span>
                  <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                    {t(item.descriptionKey)}
                  </span>
                </span>
              </AppLink>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}

function NavbarAuthenticatedInner({
  user,
  session: _session,
  nameApp,
  currentPath,
}: NavbarAuthenticatedProps) {
  const queryClient = useQueryClient()
  const scrolled = useScrolled()
  const overflowItems = siteNavItems.filter((item) => !item.primary)
  const onIntent = (href: string) => () => prefetchForHref(queryClient, href)

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur transition-shadow duration-300 supports-backdrop-filter:bg-background/60",
        scrolled ? "border-border shadow-sm" : "border-border/40"
      )}
    >
      <nav className="mx-auto flex h-navbar max-w-6xl items-center justify-between gap-3 px-4 md:gap-4 md:px-6">
        <AppLink
          href="/"
          className="group flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight text-foreground"
        >
          <AppLogo
            alt={nameApp}
            className="transition-transform duration-300 group-hover:scale-110"
          />
          <span className="hidden sm:inline">{nameApp}</span>
        </AppLink>

        <div className="hidden flex-1 justify-center lg:flex">
          <ul className="flex items-center gap-0.5 rounded-lg border bg-muted/40 p-1">
            {siteNavItems.map((item) => (
              <li
                key={item.href}
                className={item.primary ? undefined : "hidden xl:block"}
              >
                <NavPill
                  item={item}
                  currentPath={currentPath}
                  onIntent={onIntent}
                />
              </li>
            ))}
            <OverflowMenu
              items={overflowItems}
              currentPath={currentPath}
              onIntent={onIntent}
            />
          </ul>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:hidden">
          <LanguageSwitcher />
          <ThemeToggle />
          <SettingsLink />
          <UserNav user={user} />
          <NavbarMobileMenu
            navItems={siteNavItems}
            currentPath={currentPath}
            onPrefetch={onIntent}
          />
        </div>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          <SettingsLink />
          <UserNav user={user} />
        </div>
      </nav>
    </header>
  )
}

export function NavbarAuthenticated(props: NavbarAuthenticatedProps) {
  return (
    <AppProviders initialLocale={props.locale}>
      <NavbarAuthenticatedInner {...props} />
    </AppProviders>
  )
}
