import { Settings } from "lucide-react"
import type { NavbarNavLink } from "@/components/features/global/navbar-mobile-menu"
import { NavbarMobileMenu } from "@/components/features/global/navbar-mobile-menu"
import { ThemeToggle } from "@/components/features/global/theme-toggle"
import { UserNav } from "@/components/features/global/user-nav"
import { cn } from "@/lib/utils"

export interface NavbarAuthenticatedProps {
  nameApp: string
  navLinks: NavbarNavLink[]
  currentPath: string
}

const triggerClass =
  "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground flex h-9 w-9 items-center justify-center border transition-colors"

function linkClassName(active: boolean) {
  return cn(
    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
    active
      ? "bg-secondary text-foreground"
      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
  )
}

export function NavbarAuthenticated({
  nameApp,
  navLinks,
  currentPath,
}: NavbarAuthenticatedProps) {
  return (
    <header className="border-border bg-background sticky top-0 z-50 border-b w-full">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 md:gap-4 md:px-6">
        <a
          href="/"
          className="flex shrink-0 items-center gap-2 font-mono text-sm font-semibold tracking-wide text-foreground transition-transform duration-300 hover:scale-110"
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
                <a href={href} className={linkClassName(isActive)}>
                  {label}
                </a>
              </li>
            )
          })}
        </ul>

        {/* Mobile/tablet: < lg - mobile menu */}
        <div className="flex lg:hidden shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle className="relative right-0 top-0 translate-y-0" />
          <UserNav />
          <a href="/config" aria-label="Configuración" className={triggerClass}>
            <Settings className="size-4 shrink-0" aria-hidden />
          </a>
          <NavbarMobileMenu navLinks={navLinks} currentPath={currentPath} />
        </div>

        {/* Desktop: lg+ actions */}
        <div className="hidden lg:flex shrink-0 items-center gap-2">
          <ThemeToggle className="relative right-0 top-0 translate-y-0" />
          <UserNav />
          <a href="/config" aria-label="Configuración" className={triggerClass}>
            <Settings className="size-4 shrink-0" aria-hidden />
          </a>
        </div>
      </nav>
    </header>
  )
}
