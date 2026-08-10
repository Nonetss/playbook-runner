import { getIcon } from "@/lib/icon-registry"

const Menu = getIcon("controls", "menu")

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
import {
  isNavItemActive,
  isNavLinkActive,
  type SiteNavItem,
} from "@/features/app-shell/site-nav"
import { cn } from "@/lib/utils"

interface NavbarMobileMenuProps {
  navItems: SiteNavItem[]
  currentPath: string
  onPrefetch?: (href: string) => () => void
}

export function NavbarMobileMenu({
  navItems,
  currentPath,
  onPrefetch,
}: NavbarMobileMenuProps) {
  const { t: tCommon } = useTranslation("common")
  const { t } = useTranslation("nav")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const forceClose = () => flushSync(() => setOpen(false))
    document.addEventListener("astro:before-preparation", forceClose)
    document.addEventListener("astro:before-swap", forceClose)
    document.addEventListener("astro:page-load", forceClose)
    return () => {
      document.removeEventListener("astro:before-preparation", forceClose)
      document.removeEventListener("astro:before-swap", forceClose)
      document.removeEventListener("astro:page-load", forceClose)
    }
  }, [])

  const closeBeforeNavigate = () => flushSync(() => setOpen(false))

  return (
    <div className="shrink-0 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          type="button"
          aria-label={tCommon("labels.open_navigation")}
          className={navTriggerClass}
        >
          <Menu className="size-4 shrink-0" aria-hidden />
        </SheetTrigger>
        {open ? (
          <SheetContent
            side="right"
            className="gap-0 border-border bg-popover p-0 text-popover-foreground data-[state=closed]:animate-none sm:max-w-xs [&>button]:top-3.5 [&>button]:text-muted-foreground hover:[&>button]:text-foreground"
          >
            <SheetHeader className="border-border border-b px-4 py-4 text-left">
              <SheetTitle className="font-mono text-sm font-semibold tracking-wide text-popover-foreground">
                {tCommon("labels.navigation_title")}
              </SheetTitle>
            </SheetHeader>
            <nav
              className="flex flex-col gap-0.5 p-3"
              aria-label={tCommon("labels.primary_links")}
            >
              {navItems.map((item) => {
                const active = isNavItemActive(item, currentPath)
                const Icon = item.icon
                return (
                  <div key={item.href} className="space-y-0.5">
                    <AppLink
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      onClick={closeBeforeNavigate}
                      onMouseEnter={onPrefetch?.(item.href)}
                      onFocus={onPrefetch?.(item.href)}
                    >
                      {active ? (
                        <span
                          aria-hidden
                          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary"
                        />
                      ) : null}
                      <Icon aria-hidden className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1">{t(item.labelKey)}</span>
                    </AppLink>
                    {item.subItems?.map((subItem) => {
                      const subActive = isNavLinkActive(
                        subItem.href,
                        currentPath
                      )
                      const SubIcon = subItem.icon
                      return (
                        <AppLink
                          key={subItem.href}
                          href={subItem.href}
                          aria-current={subActive ? "page" : undefined}
                          className={cn(
                            "ml-3 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                            subActive
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                          onClick={closeBeforeNavigate}
                          onMouseEnter={onPrefetch?.(subItem.href)}
                          onFocus={onPrefetch?.(subItem.href)}
                        >
                          <SubIcon
                            aria-hidden
                            className="size-3.5 shrink-0 text-primary"
                          />
                          {t(subItem.labelKey)}
                        </AppLink>
                      )
                    })}
                  </div>
                )
              })}
            </nav>
          </SheetContent>
        ) : null}
      </Sheet>
    </div>
  )
}
