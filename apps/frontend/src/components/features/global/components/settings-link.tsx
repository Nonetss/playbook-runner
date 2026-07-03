import { Settings } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

export interface SettingsLinkProps {
  className?: string
}

export function SettingsLink({ className }: SettingsLinkProps) {
  const { t } = useTranslation("common")
  return (
    <a
      href="/config"
      aria-label={t("labels.settings")}
      className={cn(
        "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex size-9 items-center justify-center rounded-md border shadow-xs transition-colors",
        className
      )}
    >
      <Settings className="size-4 shrink-0" aria-hidden />
    </a>
  )
}
