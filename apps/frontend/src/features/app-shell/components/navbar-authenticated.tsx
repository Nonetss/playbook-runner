import { useQueryClient } from "@tanstack/react-query"
import type { Session, User } from "better-auth"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { StatusDot } from "@/components/shared/data-display/status-dot"
import { AppLink } from "@/components/ui/app-link"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
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
  type SiteNavSubItem,
  siteNavItems,
} from "@/features/app-shell/site-nav"
import { useCurrentPath } from "@/hooks/use-current-path"
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
    case "/inventory/devices":
      queryClient.prefetchQuery(orpc.inventory.devices.list.queryOptions())
      return
    case "/inventory/groups":
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
      queryClient.prefetchQuery(orpc.apiKeys.list.queryOptions())
  }
}

const menuRow =
  "flex min-h-10 flex-row items-center gap-2.5 rounded-md px-2.5 py-2 text-foreground/80 outline-none transition-colors hover:bg-muted/60 hover:text-foreground focus:bg-muted/60 focus:text-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-primary"

function MenuRow({
  item,
  active,
  onIntent,
}: {
  item: SiteNavSubItem
  active: boolean
  onIntent: (href: string) => () => void
}) {
  const { t } = useTranslation("nav")
  return (
    <NavigationMenuLink asChild active={active} className={menuRow}>
      <AppLink
        href={item.href}
        aria-current={active ? "page" : undefined}
        onMouseEnter={onIntent(item.href)}
        onFocus={onIntent(item.href)}
      >
        <item.icon aria-hidden className="size-3.5 shrink-0 text-primary" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-xs font-medium leading-tight">
            {t(item.labelKey)}
          </span>
          <span className="text-xs leading-snug text-muted-foreground lg:whitespace-nowrap">
            {t(item.descriptionKey)}
          </span>
        </span>
      </AppLink>
    </NavigationMenuLink>
  )
}

/**
 * A navigation section: its trigger opens on hover or focus (Radix
 * `NavigationMenu`), listing the section hub followed by its sub-routes.
 */
function NavSection({
  item,
  currentPath,
  onIntent,
}: {
  item: SiteNavItem
  currentPath: string
  onIntent: (href: string) => () => void
}) {
  const { t } = useTranslation("nav")
  const active = isNavItemActive(item, currentPath)

  if (!item.subItems?.length) {
    return (
      <NavigationMenuItem>
        <NavigationMenuLink asChild active={active}>
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
        </NavigationMenuLink>
      </NavigationMenuItem>
    )
  }

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger
        aria-current={active ? "page" : undefined}
        className={cn(
          pillBase,
          "h-auto bg-transparent focus:bg-transparent data-[state=open]:bg-muted/40 data-[state=open]:hover:bg-muted/40 data-[state=open]:focus:bg-muted/40",
          active ? pillActive : pillInactive,
          active && "data-[state=open]:bg-primary/10"
        )}
        onMouseEnter={onIntent(item.href)}
        onFocus={onIntent(item.href)}
      >
        {t(item.labelKey)}
        {active ? <StatusDot tone="primary" /> : null}
      </NavigationMenuTrigger>
      <NavigationMenuContent className="left-1/2 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 p-1.5 md:w-max">
        <MenuRow
          item={item}
          active={currentPath === item.href}
          onIntent={onIntent}
        />
        <div className="my-1 border-t" />
        {item.subItems.map((subItem) => (
          <MenuRow
            key={subItem.href}
            item={subItem}
            active={isNavLinkActive(subItem.href, currentPath)}
            onIntent={onIntent}
          />
        ))}
      </NavigationMenuContent>
    </NavigationMenuItem>
  )
}

function NavbarAuthenticatedInner({
  user,
  session: _session,
  nameApp,
  currentPath: initialPath,
}: NavbarAuthenticatedProps) {
  const currentPath = useCurrentPath(initialPath)
  const queryClient = useQueryClient()
  const scrolled = useScrolled()
  const onIntent = (href: string) => () => prefetchForHref(queryClient, href)

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur transition-shadow duration-300 supports-backdrop-filter:bg-background/60",
        scrolled ? "border-border shadow-sm" : "border-border/40"
      )}
    >
      <nav className="flex h-navbar items-center justify-between gap-3 px-4 sm:px-6 md:gap-4">
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
          <NavigationMenu viewport={false}>
            <NavigationMenuList className="gap-1">
              {siteNavItems.map((item) => (
                <NavSection
                  key={item.href}
                  item={item}
                  currentPath={currentPath}
                  onIntent={onIntent}
                />
              ))}
            </NavigationMenuList>
          </NavigationMenu>
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
