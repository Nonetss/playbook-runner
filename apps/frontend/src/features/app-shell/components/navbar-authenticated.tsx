import { noop, useQueryClient } from "@tanstack/react-query"
import type { Session, User } from "better-auth"
import { useState } from "react"
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
import { Separator } from "@/components/ui/separator"
import { AppLogo } from "@/features/app-shell/components/app-logo"
import { LanguageSwitcher } from "@/features/app-shell/components/language-switcher"
import { NavbarMobileMenu } from "@/features/app-shell/components/navbar-mobile-menu"
import { NavbarSearchTrigger } from "@/features/app-shell/components/navbar-search-trigger"
import { SurfaceSearchDialog } from "@/features/app-shell/components/surface-search-dialog"
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
  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-200 focus-ring"
const pillInactive =
  "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
const pillActive = "bg-primary/10 text-primary"
// Radix returns focus to the trigger when a menu link closes the menu, and the
// navbar persists across navigations, so the active pill must survive the
// trigger's hover, focus and open states instead of the shadcn defaults.
const triggerInactive = cn(
  pillInactive,
  "bg-transparent focus:bg-transparent data-[state=open]:bg-muted/40 data-[state=open]:hover:bg-muted/40 data-[state=open]:focus:bg-muted/40"
)
const triggerActive = cn(
  pillActive,
  "hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary data-[state=open]:hover:bg-primary/10 data-[state=open]:focus:bg-primary/10"
)

/**
 * Warms the cache for the page a nav link points to. `query` only fetches
 * when the cached data is stale; a failure is ignored because the page
 * loads the same query again on mount.
 */
function prefetchForHref(
  queryClient: ReturnType<typeof useQueryClient>,
  href: string
) {
  switch (href) {
    case "/inventory/devices":
      queryClient.query(orpc.inventory.devices.list.queryOptions()).catch(noop)
      return
    case "/inventory/groups":
      queryClient.query(orpc.inventory.groups.list.queryOptions()).catch(noop)
      return
    case "/inventory/credentials":
      queryClient.query(orpc.credentials.list.queryOptions()).catch(noop)
      return
    case "/playbooks":
      queryClient.query(orpc.playbooks.list.queryOptions()).catch(noop)
      return
    case "/scripts":
      queryClient.query(orpc.scripts.list.queryOptions()).catch(noop)
      return
    case "/jobs/scheduler":
      queryClient.query(orpc.jobs.list.queryOptions()).catch(noop)
      return
    case "/history":
    case "/jobs/history":
      queryClient
        .query(orpc.jobs.runs.listAll.queryOptions({ input: { limit: 25 } }))
        .catch(noop)
      return
    case "/config":
      queryClient.query(orpc.apiKeys.list.queryOptions()).catch(noop)
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
            className={cn(
              pillBase,
              // NavigationMenuLink's own `flex-col` reaches the child through
              // asChild; keep the active dot beside the label.
              "flex-row",
              active ? pillActive : pillInactive
            )}
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
          "h-auto",
          active ? triggerActive : triggerInactive
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
  const [searchOpen, setSearchOpen] = useState(false)
  const openSearch = () => setSearchOpen(true)

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur transition-shadow duration-300 supports-backdrop-filter:bg-background/60",
        scrolled ? "border-border shadow-sm" : "border-border/40"
      )}
    >
      <nav className="flex h-navbar items-center justify-between gap-3 px-4 sm:px-6 md:gap-4 lg:grid lg:grid-cols-[auto_1fr_auto] lg:gap-x-6">
        <AppLink
          href="/"
          className="group flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight text-foreground pointer-coarse:min-h-10 pointer-coarse:min-w-10 lg:justify-self-start"
        >
          <AppLogo
            alt={nameApp}
            className="transition-transform duration-300 group-hover:scale-110"
          />
          <span className="hidden sm:inline">{nameApp}</span>
        </AppLink>

        <div className="hidden min-w-0 items-center gap-6 lg:flex lg:justify-self-start">
          <Separator
            orientation="vertical"
            className="self-center data-[orientation=vertical]:h-5"
          />
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
          <UserNav user={user} />
          <NavbarSearchTrigger variant="icon" onOpen={openSearch} />
          <NavbarMobileMenu
            navItems={siteNavItems}
            currentPath={currentPath}
            onPrefetch={onIntent}
          />
        </div>

        <div className="hidden shrink-0 items-center gap-2 lg:flex lg:justify-self-end">
          <LanguageSwitcher />
          <ThemeToggle />
          <NavbarSearchTrigger variant="field" onOpen={openSearch} />
          <UserNav user={user} />
        </div>
      </nav>
      <SurfaceSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        currentPath={currentPath}
        userId={user.id}
      />
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
