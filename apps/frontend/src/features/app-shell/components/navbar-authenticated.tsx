import type { Session, User } from "better-auth"
import { ChevronDown, ChevronRight, Settings } from "lucide-react"
import { AppProviders } from "@/components/providers/app-providers"
import { AppLink } from "@/components/ui/app-link"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { SlidingPillNav } from "@/components/ui/sliding-pill-nav"
import { AppLogo } from "@/features/app-shell/components/app-logo"
import { NavbarMobileMenu } from "@/features/app-shell/components/navbar-mobile-menu"
import { ThemeToggle } from "@/features/app-shell/components/theme-toggle"
import { UserNav } from "@/features/app-shell/components/user-nav"
import { navTriggerClass } from "@/features/app-shell/nav-trigger"
import { getSiteNavItems, isNavLinkActive } from "@/features/app-shell/site-nav"
import { usePathname } from "@/hooks/usePathname"
import { useScrolled } from "@/hooks/useScrolled"
import { cn } from "@/lib/utils"

export interface NavbarAuthenticatedProps {
  user: User
  session: Session
  nameApp: string
  currentPath?: string
  locale?: string
}

function pillTextClassName(active: boolean) {
  return cn(
    "transition-colors duration-300",
    active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
  )
}

function NavbarAuthenticatedInner({
  user,
  session: _session,
  nameApp,
}: NavbarAuthenticatedProps) {
  const navLinks = getSiteNavItems(false)
  const currentPath = usePathname()
  const activeIndex = navLinks.findIndex(({ href }) =>
    isNavLinkActive(href, currentPath)
  )
  const scrolled = useScrolled()

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
            {navLinks.map(({ href, label, subItems }) => {
              const isActive = isNavLinkActive(href, currentPath)
              const pill = (
                <div
                  data-sliding-pill-item
                  className={cn(
                    "relative z-10 flex items-center gap-1 rounded-lg px-3.5 py-1.5 font-medium text-xs",
                    pillTextClassName(isActive)
                  )}
                >
                  <AppLink href={href} className="block">
                    {label}
                  </AppLink>
                  {subItems ? (
                    <ChevronDown className="size-3 opacity-60" aria-hidden />
                  ) : null}
                </div>
              )

              return (
                <li key={href}>
                  {subItems ? (
                    <HoverCard openDelay={100} closeDelay={100}>
                      <HoverCardTrigger asChild>{pill}</HoverCardTrigger>
                      <HoverCardContent
                        align="start"
                        sideOffset={8}
                        className="w-auto min-w-52 rounded-xl border bg-popover/95 p-1 shadow-md"
                      >
                        <div className="flex flex-col gap-0.5">
                          {subItems.map((sub) => {
                            const subActive = isNavLinkActive(
                              sub.href,
                              currentPath
                            )
                            const SubIcon = sub.icon
                            return (
                              <AppLink
                                key={sub.href}
                                href={sub.href}
                                className={cn(
                                  "group/link relative flex min-h-10 items-center justify-between gap-5 rounded-lg px-2.5 font-medium text-xs outline-none transition-[background-color,color,transform,box-shadow] duration-150 hover:translate-x-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-popover",
                                  subActive
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"
                                )}
                              >
                                <span className="flex items-center gap-2.5">
                                  <span
                                    className={cn(
                                      "flex size-6 shrink-0 items-center justify-center rounded-md transition-colors",
                                      subActive
                                        ? "bg-primary-foreground/15 text-primary-foreground"
                                        : "bg-muted text-muted-foreground group-hover/link:bg-background group-hover/link:text-foreground"
                                    )}
                                  >
                                    <SubIcon className="size-3.5" />
                                  </span>
                                  {sub.label}
                                </span>
                                <ChevronRight
                                  className={cn(
                                    "size-3.5 shrink-0 transition-[color,transform] duration-150 group-hover/link:translate-x-0.5",
                                    subActive
                                      ? "text-primary-foreground/90"
                                      : "text-muted-foreground/60 group-hover/link:text-foreground"
                                  )}
                                  aria-hidden
                                />
                              </AppLink>
                            )
                          })}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ) : (
                    pill
                  )}
                </li>
              )
            })}
          </SlidingPillNav>
        </div>

        {/* Mobile/tablet: < lg - mobile menu */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:hidden">
          <ThemeToggle />
          <UserNav user={user} />
          <AppLink
            href="/config"
            aria-label="Configuración"
            className={navTriggerClass}
          >
            <Settings className="size-4 shrink-0" aria-hidden />
          </AppLink>
          <NavbarMobileMenu navLinks={navLinks} currentPath={currentPath} />
        </div>

        {/* Desktop: lg+ actions */}
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <ThemeToggle />
          <UserNav user={user} />
          <AppLink
            href="/config"
            aria-label="Configuración"
            className={navTriggerClass}
          >
            <Settings className="size-4 shrink-0" aria-hidden />
          </AppLink>
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
