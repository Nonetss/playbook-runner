import { Menu } from "lucide-react"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export interface NavbarNavLink {
  href: string
  label: string
}

interface NavbarMobileMenuProps {
  navLinks: NavbarNavLink[]
  currentPath: string
}

export function NavbarMobileMenu({
  navLinks,
  currentPath,
}: NavbarMobileMenuProps) {
  return (
    <div className="shrink-0 lg:hidden">
      <Sheet>
        <SheetTrigger
          render={
            <button
              type="button"
              aria-label="Abrir menú de navegación"
              aria-haspopup="dialog"
              className="border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground flex h-9 w-9 shrink-0 items-center justify-center border transition-colors"
            >
              <Menu className="size-4 shrink-0" aria-hidden />
            </button>
          }
        />
        <SheetContent
          side="right"
          className="gap-0 p-0 sm:max-w-xs [&>button]:top-3.5"
        >
          <SheetHeader className="border-border border-b px-4 py-4 text-left">
            <SheetTitle className="font-mono text-sm font-semibold tracking-wide">
              Navegación
            </SheetTitle>
          </SheetHeader>
          <nav
            className="flex flex-col gap-0.5 p-3"
            aria-label="Enlaces principales"
          >
            {navLinks.map(({ href, label }) => {
              const isActive =
                href === "/"
                  ? currentPath === "/"
                  : currentPath.startsWith(href)
              return (
                <SheetClose
                  key={href}
                  render={
                    <a
                      href={href}
                      className={cn(
                        "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {label}
                    </a>
                  }
                />
              )
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  )
}
