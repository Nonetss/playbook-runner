import { ThemeToggle } from "@/components/features/global/theme-toggle"

interface NavbarGuestProps {
  nameApp: string
}

export function NavbarGuest({ nameApp }: NavbarGuestProps) {
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

        <ThemeToggle className="absolute right-4 top-1/2 -translate-y-1/2" />
      </nav>
    </header>
  )
}
