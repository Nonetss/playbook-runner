import { getIcon } from "@/lib/icon-registry"

const Menu = getIcon("controls", "menu")

import { type CSSProperties, type ReactNode, useEffect, useState } from "react"
import { flushSync } from "react-dom"
import { useTranslation } from "react-i18next"
import { textVariants } from "@/components/shared/brand/typography"
import { Hint } from "@/components/shared/feedback/hint"
import { NavbarAction } from "@/components/shared/navigation/navbar-action"
import { AppLink } from "@/components/ui/app-link"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  isNavItemActive,
  isNavLinkActive,
  type SiteNavItem,
} from "@/features/app-shell/site-nav"
import { appSurfaces } from "@/lib/app-surfaces"
import { cn } from "@/lib/utils"

const DashboardIcon = appSurfaces.dashboard.icon

/** A top-level row of the slide-out menu; the active one carries a primary bar. */
function MobileSectionLink({
  href,
  active,
  icon: Icon,
  onClick,
  onPrefetch,
  children,
}: {
  href: string
  active: boolean
  icon: SiteNavItem["icon"]
  onClick: () => void
  onPrefetch?: (href: string) => () => void
  children: ReactNode
}) {
  return (
    <AppLink
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      onClick={onClick}
      onMouseEnter={onPrefetch?.(href)}
      onFocus={onPrefetch?.(href)}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary"
        />
      ) : null}
      <Icon
        aria-hidden
        className={cn(
          "size-4 shrink-0",
          active ? "text-primary" : "text-muted-foreground"
        )}
      />
      <span className="min-w-0 flex-1">{children}</span>
    </AppLink>
  )
}

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
        <Hint label={tCommon("labels.open_navigation")} side="bottom">
          <SheetTrigger asChild>
            <NavbarAction aria-label={tCommon("labels.open_navigation")}>
              <Menu className="size-4 shrink-0" aria-hidden />
            </NavbarAction>
          </SheetTrigger>
        </Hint>
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
              className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain p-3"
              aria-label={tCommon("labels.primary_links")}
            >
              <div className="dash-enter flex flex-col gap-0.5">
                <MobileSectionLink
                  href={appSurfaces.dashboard.href}
                  active={currentPath === "/"}
                  icon={DashboardIcon}
                  onClick={closeBeforeNavigate}
                >
                  {t(appSurfaces.dashboard.titleKey)}
                </MobileSectionLink>
              </div>
              {navItems.map((item, index) => {
                const active = isNavItemActive(item, currentPath)
                return (
                  <div
                    key={item.href}
                    className="dash-enter flex flex-col gap-0.5"
                    style={
                      {
                        "--dash-delay": `${(index + 1) * 45}ms`,
                      } as CSSProperties
                    }
                  >
                    <MobileSectionLink
                      href={item.href}
                      active={active}
                      icon={item.icon}
                      onClick={closeBeforeNavigate}
                      onPrefetch={onPrefetch}
                    >
                      {t(item.labelKey)}
                    </MobileSectionLink>
                    {item.subItems ? (
                      <div className="ml-3.5 flex flex-col gap-0.5 border-border border-l py-0.5 pl-2.5">
                        {item.subItems.map((subItem) => {
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
                                textVariants({ role: "compact" }),
                                "flex items-center gap-2 rounded-md px-2.5 py-2 font-medium transition-colors",
                                subActive
                                  ? "text-primary"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                              onClick={closeBeforeNavigate}
                              onMouseEnter={onPrefetch?.(subItem.href)}
                              onFocus={onPrefetch?.(subItem.href)}
                            >
                              <SubIcon
                                aria-hidden
                                className={cn(
                                  "size-3.5 shrink-0",
                                  subActive
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                )}
                              />
                              {t(subItem.labelKey)}
                            </AppLink>
                          )
                        })}
                      </div>
                    ) : null}
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
