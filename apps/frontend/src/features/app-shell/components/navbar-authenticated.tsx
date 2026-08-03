import { useQueryClient } from "@tanstack/react-query"
import type { Session, User } from "better-auth"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { AppLink } from "@/components/ui/app-link"
import { SlidingPillNav } from "@/components/ui/sliding-pill-nav"
import { AppLogo } from "@/features/app-shell/components/app-logo"
import { LanguageSwitcher } from "@/features/app-shell/components/language-switcher"
import { NavbarMobileMenu } from "@/features/app-shell/components/navbar-mobile-menu"
import { SettingsLink } from "@/features/app-shell/components/settings-link"
import { ThemeToggle } from "@/features/app-shell/components/theme-toggle"
import { UserNav } from "@/features/app-shell/components/user-nav"
import { isNavLinkActive, siteNavItems } from "@/features/app-shell/site-nav"
import { useScrolled } from "@/hooks/useScrolled"
import { orpc } from "@/lib/orpc"
import { cn } from "@/lib/utils"

export interface NavbarAuthenticatedProps {
  user: User
  session: Session
  nameApp: string
  currentPath: string
  locale: string
}

function pillTextClassName(active: boolean) {
  return cn(
    "transition-colors duration-300",
    active
      ? "text-secondary-foreground"
      : "text-muted-foreground hover:text-foreground"
  )
}

/**
 * Map a section's nav href to the oRPC list query options whose data should
 * be prefetched on hover. Each section owns one main list — keep this list
 * aligned with the top-level resources (inventory / credentials / playbooks).
 */
function prefetchForHref(
  queryClient: ReturnType<typeof useQueryClient>,
  href: string
) {
  switch (href) {
    case "/inventory":
      queryClient.prefetchQuery(orpc.inventory.devices.list.queryOptions())
      queryClient.prefetchQuery(orpc.inventory.groups.list.queryOptions())
      return
    case "/credentials":
      queryClient.prefetchQuery(orpc.credentials.list.queryOptions())
      return
    case "/playbooks":
      queryClient.prefetchQuery(orpc.playbooks.list.queryOptions())
      return
    case "/scripts":
      queryClient.prefetchQuery(orpc.scripts.list.queryOptions())
      return
    case "/jobs":
      queryClient.prefetchQuery(orpc.jobs.list.queryOptions())
      return
    case "/history":
      queryClient.prefetchQuery(
        orpc.jobs.runs.listAll.queryOptions({ input: { limit: 25 } })
      )
      return
    case "/config":
      queryClient.prefetchQuery(orpc.config.apiKeys.list.queryOptions())
      return
    default:
      return
  }
}

function NavbarAuthenticatedInner({
  user,
  session: _session,
  nameApp,
  currentPath,
}: NavbarAuthenticatedProps) {
  const queryClient = useQueryClient()
  const { t } = useTranslation("nav")
  const scrolled = useScrolled()

  const navLinks = siteNavItems.map(({ href, labelKey }) => ({
    href,
    label: t(labelKey),
  }))
  const activeIndex = navLinks.findIndex(({ href }) =>
    isNavLinkActive(href, currentPath)
  )

  function handlePrefetch(href: string) {
    return () => prefetchForHref(queryClient, href)
  }

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
          className="group flex shrink-0 items-center gap-2 font-semibold text-foreground text-sm tracking-tight"
        >
          <AppLogo
            alt={nameApp}
            className="transition-transform duration-300 group-hover:scale-110"
          />
          <span className="hidden sm:inline">{nameApp}</span>
        </AppLink>

        {/* Desktop: lg+ - segmented nav (same radius as action buttons) */}
        <div className="hidden flex-1 justify-center lg:flex">
          <SlidingPillNav
            activeIndex={activeIndex}
            className="flex items-center gap-0.5 rounded-lg border bg-muted/40 p-1"
            pillClassName="rounded-lg border border-border/60 bg-background shadow-sm"
          >
            {navLinks.map(({ href, label }) => {
              const isActive = isNavLinkActive(href, currentPath)
              return (
                <li key={href}>
                  <AppLink
                    href={href}
                    data-sliding-pill-item
                    className={cn(
                      "relative z-10 block rounded-lg px-3.5 py-1.5 font-medium text-xs",
                      pillTextClassName(isActive)
                    )}
                    onMouseEnter={handlePrefetch(href)}
                    onFocus={handlePrefetch(href)}
                  >
                    {label}
                  </AppLink>
                </li>
              )
            })}
          </SlidingPillNav>
        </div>

        {/* Mobile/tablet: < lg - mobile menu */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:hidden">
          <LanguageSwitcher />
          <ThemeToggle />
          <SettingsLink />
          <UserNav user={user} />
          <NavbarMobileMenu
            navLinks={navLinks}
            currentPath={currentPath}
            onPrefetch={handlePrefetch}
          />
        </div>

        {/* Desktop: lg+ actions */}
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
