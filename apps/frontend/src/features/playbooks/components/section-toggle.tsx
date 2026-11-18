import { getIcon } from "@/lib/icon-registry"

const ChevronDown = getIcon("controls", "expand")

import { useTranslation } from "react-i18next"
import { Hint } from "@/components/shared/feedback/hint"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Chevron that collapses a folder or repository section of the browser. */
export function SectionToggle({
  name,
  collapsed,
  controls,
  onToggle,
}: {
  name: string
  collapsed: boolean
  /** Id of the element the toggle shows/hides. */
  controls: string
  onToggle: () => void
}) {
  const { t } = useTranslation("playbooks")
  const label = collapsed
    ? t("section.expand", { name })
    : t("section.collapse", { name })
  return (
    <Hint label={label}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-expanded={!collapsed}
        aria-controls={controls}
        aria-label={label}
        onClick={onToggle}
        className="-ml-2 shrink-0 text-muted-foreground"
      >
        <ChevronDown
          className={cn(
            "size-4 transition-transform motion-reduce:transition-none",
            collapsed && "-rotate-90"
          )}
        />
      </Button>
    </Hint>
  )
}
