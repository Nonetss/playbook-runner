import { Menu } from "lucide-react"
import { useEffect, useState } from "react"
import { flushSync } from "react-dom"
import { useTranslation } from "react-i18next"
import { AppLink } from "@/components/ui/app-link"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { navTriggerClass } from "@/features/app-shell/nav-trigger"
import { isNavLinkActive } from "@/features/app-shell/site-nav"
import { cn } from "@/lib/utils"

export interface NavbarNavLink {
  href: string
  label: string
}

interface NavbarMobileMenuProps {
  navLinks: NavbarNavLink[]
  currentPath: string
  onPrefetch?: (href: string) => () => void
}

export function NavbarMobileMenu({
  navLinks,
  currentPath,
  onPrefetch,
}: NavbarMobileMenuProps) {
  const { t } = useTranslation("common")
  const [open, setOpen] = useState(false)

  // Navbar is `transition:persist`ed. If the sheet portal is still in the DOM
  // when Astro swaps the page, body scroll-lock + overlay race the view
  // transition and the sticky header jumps. Tear it down before the swap.
  useEffect(() => {
    const forceClose = () => {
      flushSync(() => setOpen(false))
    }
    document.addEventListener("astro:before-preparation", forceClose)
    document.addEventListener("astro:before-swap", forceClose)
    document.addEventListener("astro:page-load", forceClose)
    return () => {
      document.removeEventListener("astro:before-preparation", forceClose)
      document.removeEventListener("astro:before-swap", forceClose)
      document.removeEventListener("astro:page-load", forceClose)
    }
  }, [])

  // Close synchronously on click so the portal is gone before `navigate()`
  // kicks off the view transition — same reason as the swap listeners above.
  const closeBeforeNavigate = () => {
    flushSync(() => setOpen(false))
  }

  return (
    <div className="shrink-0 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          type="button"
          aria-label={t("labels.open_navigation")}
          className={navTriggerClass}
        >
          <Menu className="size-4 shrink-0" aria-hidden />
        </SheetTrigger>
        {/* Mount content only while open so close unmounts the portal
            immediately — no exit animation racing View Transitions. */}
        {open ? (
          <SheetContent
            side="right"
            className="gap-0 border-border bg-popover p-0 text-popover-foreground data-[state=closed]:animate-none sm:max-w-xs [&>button]:top-3.5 [&>button]:text-muted-foreground hover:[&>button]:text-foreground"
          >
            <SheetHeader className="border-border border-b px-4 py-4 text-left">
              <SheetTitle className="font-mono font-semibold text-popover-foreground text-sm tracking-wide">
                {t("labels.navigation_title")}
              </SheetTitle>
            </SheetHeader>
            <nav
              className="flex flex-col gap-0.5 p-3"
              aria-label={t("labels.primary_links")}
            >
              {navLinks.map(({ href, label }) => {
                const isActive = isNavLinkActive(href, currentPath)
                return (
                  <AppLink
                    key={href}
                    href={href}
                    className={cn(
                      "relative rounded-lg px-3 py-2.5 font-medium text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    onClick={closeBeforeNavigate}
                    onMouseEnter={onPrefetch?.(href)}
                    onFocus={onPrefetch?.(href)}
                  >
                    {isActive ? (
                      <span
                        aria-hidden
                        className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary"
                      />
                    ) : null}
                    {label}
                  </AppLink>
                )
              })}
            </nav>
          </SheetContent>
        ) : null}
      </Sheet>
    </div>
  )
}
