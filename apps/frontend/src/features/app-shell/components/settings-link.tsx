import { getIcon } from "@/lib/icon-registry"

const Settings = getIcon("actions", "settings")

import { useTranslation } from "react-i18next"
import { AppLink } from "@/components/ui/app-link"
import { navTriggerClass } from "@/features/app-shell/nav-trigger"
import { cn } from "@/lib/utils"

export interface SettingsLinkProps {
  className?: string
}

export function SettingsLink({ className }: SettingsLinkProps) {
  const { t } = useTranslation("common")
  return (
    <AppLink
      href="/config"
      aria-label={t("labels.settings")}
      className={cn(navTriggerClass, className)}
    >
      <Settings className="size-4 shrink-0" aria-hidden />
    </AppLink>
  )
}
