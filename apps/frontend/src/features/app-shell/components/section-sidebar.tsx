import { useTranslation } from "react-i18next"
import { AppLink } from "@/components/ui/app-link"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { SiteNavIcon } from "@/features/app-shell/components/site-nav-icon"
import {
  getSiteNavItemByHref,
  isNavLinkActive,
} from "@/features/app-shell/site-nav"

interface SectionSidebarProps {
  /** Section href in `siteNavItems`; it drives the header and links. */
  section: string
  currentPath: string
}

export function SectionSidebar({ section, currentPath }: SectionSidebarProps) {
  const { t } = useTranslation("nav")
  const item = getSiteNavItemByHref(section)
  if (!item?.subItems) return null

  return (
    <Sidebar
      collapsible="icon"
      className="top-(--navbar-height) h-[calc(100svh-var(--navbar-height))]!"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={t(item.labelKey)}>
              <AppLink
                href={item.href}
                className="gap-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
              >
                <SiteNavIcon href={item.href} className="size-4 shrink-0" />
                <span className="truncate font-semibold group-data-[collapsible=icon]:hidden">
                  {t(item.labelKey)}
                </span>
              </AppLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {t("labels.section_navigation")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {item.subItems.map(({ href, labelKey, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isNavLinkActive(href, currentPath)}
                    tooltip={t(labelKey)}
                  >
                    <AppLink href={href}>
                      <Icon />
                      <span>{t(labelKey)}</span>
                    </AppLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
