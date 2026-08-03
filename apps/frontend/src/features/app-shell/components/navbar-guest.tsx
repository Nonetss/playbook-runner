import { AppLink } from "@/components/ui/app-link"
import { AppLogo } from "@/features/app-shell/components/app-logo"
import { ThemeToggle } from "@/features/app-shell/components/theme-toggle"
import { useScrolled } from "@/hooks/useScrolled"
import { cn } from "@/lib/utils"

interface NavbarGuestProps {
  nameApp: string
  locale?: string
}

export function NavbarGuest({ nameApp }: NavbarGuestProps) {
  const scrolled = useScrolled()

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-background/80 backdrop-blur transition-shadow duration-300 supports-backdrop-filter:bg-background/60",
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
          {nameApp}
        </AppLink>

        <ThemeToggle />
      </nav>
    </header>
  )
}
