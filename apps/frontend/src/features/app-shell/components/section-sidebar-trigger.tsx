import { getIcon } from "@/lib/icon-registry"

const PanelLeft = getIcon("controls", "sidebar")

import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { Text } from "@/components/shared/brand/typography"
import { toggleSectionSidebar } from "@/features/app-shell/sidebar-events"
import { useCurrentPath } from "@/hooks/use-current-path"
import { appSurfaces, getSectionForPath } from "@/lib/app-surfaces"

function SectionSidebarTriggerInner({ currentPath }: { currentPath: string }) {
  const { t } = useTranslation("nav")
  const path = useCurrentPath(currentPath)
  const section = getSectionForPath(path)
  if (!section) return null

  return (
    <button
      type="button"
      onClick={toggleSectionSidebar}
      aria-label={t("actions.expand_sidebar")}
      className="inline-flex min-h-11 items-center gap-2 text-muted-foreground transition-colors hover:text-foreground focus-ring"
    >
      <PanelLeft className="size-4" aria-hidden />
      <Text variant="status">{t(appSurfaces[section].titleKey)}</Text>
    </button>
  )
}

/** Below `md` the sidebar is an off-canvas sheet; this row opens it. */
export function SectionSidebarTrigger({
  currentPath,
}: {
  currentPath: string
}) {
  return (
    <AppProviders>
      <SectionSidebarTriggerInner currentPath={currentPath} />
    </AppProviders>
  )
}
