import { useQueryClient } from "@tanstack/react-query"
import type { Session, User } from "better-auth"
import type { NavbarNavLink } from "@/components/features/global/navbar-mobile-menu"
import { NavbarMobileMenu } from "@/components/features/global/navbar-mobile-menu"
import { SettingsLink } from "@/components/features/global/settings-link"
import { ThemeToggle } from "@/components/features/global/theme-toggle"
import { UserNav } from "@/components/features/global/user-nav"
import { AppProviders } from "@/components/providers/app-providers"
import { SlidingPillNav } from "@/components/ui/sliding-pill-nav"
import { orpc } from "@/lib/orpc"
import { cn } from "@/lib/utils"

export interface NavbarAuthenticatedProps {
  user: User
  session: Session
  nameApp: string
  navLinks: NavbarNavLink[]
  currentPath: string
}

function linkClassName(active: boolean) {
  return cn(
    "relative z-10 inline-block rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-300",
    active
      ? "text-secondary-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
  )
}

function isNavLinkActive(href: string, currentPath: string) {
  return href === "/" ? currentPath === "/" : currentPath.startsWith(href)
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
  navLinks,
  currentPath,
}: NavbarAuthenticatedProps) {
  const queryClient = useQueryClient()

  const activeNavIndex = navLinks.findIndex(({ href }) =>
    isNavLinkActive(href, currentPath)
  )

  function handlePrefetch(href: string) {
    return () => prefetchForHref(queryClient, href)
  }

  return (
    <header className="border-border bg-background sticky top-0 z-50 w-full border-b">
      <nav className="flex h-14 w-full items-center justify-between gap-3 px-4 md:gap-4 md:px-6 lg:px-8">
        <a
          href="/"
          className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight text-foreground transition-opacity duration-200 hover:opacity-80"
        >
          <img
            src="/logo.svg"
            alt={nameApp}
            width={32}
            height={32}
            className="shrink-0"
          />
          <span className="flex flex-col leading-none">
            {nameApp.split(" ").map((word, index) => (
              <span
                key={`${word}-${index}`}
                className={cn(
                  index === 0
                    ? "text-sm font-bold tracking-tight"
                    : "text-[10px] font-medium text-muted-foreground uppercase tracking-widest"
                )}
              >
                {word}
              </span>
            ))}
          </span>
        </a>

        {/* Desktop: lg+ - show links normally */}
        <SlidingPillNav
          activeIndex={activeNavIndex}
          className="hidden lg:flex flex-1 items-center justify-center gap-1"
        >
          {navLinks.map(({ href, label }) => {
            const isActive = isNavLinkActive(href, currentPath)
            return (
              <li key={href}>
                <a
                  href={href}
                  data-sliding-pill-item
                  className={linkClassName(isActive)}
                  onMouseEnter={handlePrefetch(href)}
                  onFocus={handlePrefetch(href)}
                >
                  {label}
                </a>
              </li>
            )
          })}
        </SlidingPillNav>

        {/* Mobile/tablet: < lg - mobile menu */}
        <div className="flex lg:hidden shrink-0 items-center gap-1.5 sm:gap-2">
          <NavbarMobileMenu
            navLinks={navLinks}
            currentPath={currentPath}
            onPrefetch={handlePrefetch}
          />
          <ThemeToggle className="relative right-0 top-0 translate-y-0" />
          <SettingsLink />
          <UserNav user={user} />
        </div>

        {/* Desktop: lg+ actions */}
        <div className="hidden lg:flex shrink-0 items-center gap-2">
          <ThemeToggle className="relative right-0 top-0 translate-y-0" />
          <SettingsLink />
          <UserNav user={user} />
        </div>
      </nav>
    </header>
  )
}

export function NavbarAuthenticated(props: NavbarAuthenticatedProps) {
  return (
    <AppProviders>
      <NavbarAuthenticatedInner {...props} />
    </AppProviders>
  )
}
