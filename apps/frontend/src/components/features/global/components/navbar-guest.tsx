import { LanguageSwitcher } from "@/components/features/global/components/language-switcher"
import { ThemeToggle } from "@/components/features/global/components/theme-toggle"
import { AppProviders } from "@/components/providers/app-providers"

interface NavbarGuestProps {
  nameApp: string
  locale: string
}

export function NavbarGuest(props: NavbarGuestProps) {
  return (
    <AppProviders initialLocale={props.locale}>
      <NavbarGuestInner {...props} />
    </AppProviders>
  )
}

function NavbarGuestInner({ nameApp }: NavbarGuestProps) {
  return (
    <header className="border-border bg-background sticky top-0 z-50 border-b">
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
          {nameApp}
        </a>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}
