import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { AppLink } from "@/components/ui/app-link"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { SIDEBAR_TOGGLE_EVENT } from "@/features/app-shell/sidebar-events"
import { isNavLinkActive } from "@/features/app-shell/site-nav"
import { useCurrentPath } from "@/hooks/use-current-path"
import { appSections, appSurfaces, getSectionForPath } from "@/lib/app-surfaces"

function SidebarToggleBridge() {
  const { toggleSidebar } = useSidebar()

  useEffect(() => {
    document.addEventListener(SIDEBAR_TOGGLE_EVENT, toggleSidebar)
    return () =>
      document.removeEventListener(SIDEBAR_TOGGLE_EVENT, toggleSidebar)
  }, [toggleSidebar])

  return null
}

function SectionSidebarContent({ currentPath }: { currentPath: string }) {
  const { t } = useTranslation("nav")
  const { setOpenMobile } = useSidebar()
  const section = getSectionForPath(currentPath)

  // Close the mobile sheet once a navigation lands.
  useEffect(() => {
    setOpenMobile(false)
  }, [currentPath, setOpenMobile])

  if (!section) return null
  const surface = appSurfaces[section]
  const SectionIcon = surface.icon

  return (
    <Sidebar
      collapsible="icon"
      className="top-(--navbar-height) h-[calc(100svh-var(--navbar-height))]!"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              isActive={currentPath === surface.href}
              tooltip={t(surface.titleKey)}
            >
              <AppLink
                href={surface.href}
                className="gap-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
              >
                <SectionIcon className="size-4 shrink-0 text-primary" />
                <span className="truncate font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
                  {t(surface.titleKey)}
                </span>
              </AppLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-medium text-label uppercase tracking-[0.12em]">
            {t("labels.section_navigation")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {appSections[section].map((id) => {
                const item = appSurfaces[id]
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isNavLinkActive(item.href, currentPath)}
                      tooltip={t(item.titleKey)}
                    >
                      <AppLink href={item.href}>
                        <Icon />
                        <span>{t(item.titleKey)}</span>
                      </AppLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="hidden md:flex">
        <SidebarTrigger className="text-muted-foreground" />
      </SidebarFooter>
    </Sidebar>
  )
}

function SectionSidebarInner({
  currentPath: initialPath,
  defaultOpen,
}: {
  currentPath: string
  defaultOpen: boolean
}) {
  const currentPath = useCurrentPath(initialPath)
  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      className="flex min-h-0 w-auto shrink-0"
    >
      <SidebarToggleBridge />
      <SectionSidebarContent currentPath={currentPath} />
    </SidebarProvider>
  )
}

/**
 * Persisted section sidebar island. It derives the section from the live
 * path, so it stays correct when navigation moves between sections without
 * remounting.
 */
export function SectionSidebar({
  currentPath,
  defaultOpen = true,
}: {
  currentPath: string
  defaultOpen?: boolean
}) {
  return (
    <AppProviders>
      <SectionSidebarInner
        currentPath={currentPath}
        defaultOpen={defaultOpen}
      />
    </AppProviders>
  )
}
