"use client"

import { useQueryClient } from "@tanstack/react-query"
import type { Session, User } from "better-auth"
import { Settings } from "lucide-react"
import type { NavbarNavLink } from "@/components/features/global/navbar-mobile-menu"
import { NavbarMobileMenu } from "@/components/features/global/navbar-mobile-menu"
import { ThemeToggle } from "@/components/features/global/theme-toggle"
import { UserNav } from "@/components/features/global/user-nav"
import { AppProviders } from "@/components/providers/app-providers"
import { orpc } from "@/lib/orpc"
import { cn } from "@/lib/utils"

export interface NavbarAuthenticatedProps {
  user: User
  session: Session
  nameApp: string
  navLinks: NavbarNavLink[]
  currentPath: string
}

const triggerClass =
  "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex size-9 items-center justify-center rounded-md border shadow-xs transition-colors"

function linkClassName(active: boolean) {
  return cn(
    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
    active
      ? "bg-secondary text-secondary-foreground shadow-sm"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
            src="/logo.webp"
            alt={nameApp}
            width={32}
            height={32}
            className="shrink-0"
          />
          <span className="hidden sm:inline">{nameApp}</span>
        </a>

        {/* Desktop: lg+ - show links normally */}
        <ul className="hidden lg:flex flex-1 items-center justify-center gap-1">
          {navLinks.map(({ href, label }) => {
            const isActive =
              href === "/" ? currentPath === "/" : currentPath.startsWith(href)
            return (
              <li key={href}>
                <a
                  href={href}
                  className={linkClassName(isActive)}
                  onMouseEnter={handlePrefetch(href)}
                  onFocus={handlePrefetch(href)}
                >
                  {label}
                </a>
              </li>
            )
          })}
        </ul>

        {/* Mobile/tablet: < lg - mobile menu */}
        <div className="flex lg:hidden shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle className="relative right-0 top-0 translate-y-0" />
          <UserNav user={user} />
          <NavbarMobileMenu
            navLinks={navLinks}
            currentPath={currentPath}
            onPrefetch={handlePrefetch}
          />
        </div>

        {/* Desktop: lg+ actions */}
        <div className="hidden lg:flex shrink-0 items-center gap-2">
          <ThemeToggle className="relative right-0 top-0 translate-y-0" />
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
