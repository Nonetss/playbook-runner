import { getIcon } from "@/lib/icon-registry"

const Menu = getIcon("controls", "menu")

import { useEffect, useState } from "react"
import { flushSync } from "react-dom"
import { useTranslation } from "react-i18next"
import { textVariants } from "@/components/shared/brand/typography"
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
import { appSurfaces } from "@/lib/app-surfaces"
import { cn } from "@/lib/utils"

const DashboardIcon = appSurfaces.dashboard.icon

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
              <SheetTitle
                className={textVariants({ role: "label", tone: "muted" })}
              >
                {tCommon("labels.navigation_title")}
              </SheetTitle>
            </SheetHeader>
            <nav
              className="flex flex-col gap-0.5 p-3"
              aria-label={tCommon("labels.primary_links")}
            >
              <AppLink
                href={appSurfaces.dashboard.href}
                aria-current={currentPath === "/" ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  currentPath === "/"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
                onClick={closeBeforeNavigate}
              >
                <DashboardIcon aria-hidden className="size-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  {t(appSurfaces.dashboard.titleKey)}
                </span>
              </AppLink>
              {navItems.map((item) => {
                const active = isNavItemActive(item, currentPath)
                const Icon = item.icon
                return (
                  <div key={item.href} className="space-y-0.5">
                    <AppLink
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                      )}
                      onClick={closeBeforeNavigate}
                      onMouseEnter={onPrefetch?.(item.href)}
                      onFocus={onPrefetch?.(item.href)}
                    >
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
                            "ml-3 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                            subActive
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          )}
                          onClick={closeBeforeNavigate}
                          onMouseEnter={onPrefetch?.(subItem.href)}
                          onFocus={onPrefetch?.(subItem.href)}
                        >
                          <SubIcon aria-hidden className="size-3.5 shrink-0" />
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
