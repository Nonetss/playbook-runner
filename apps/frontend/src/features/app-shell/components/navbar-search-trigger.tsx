import { useTranslation } from "react-i18next"
import { textVariants } from "@/components/shared/brand/typography"
import { navTriggerClass } from "@/features/app-shell/nav-trigger"
import { getIcon } from "@/lib/icon-registry"
import { cn } from "@/lib/utils"

const SearchIcon = getIcon("views", "search")

/** `⌘K` on Apple platforms, `Ctrl K` elsewhere. The navbar is client-only. */
function shortcutLabel() {
  const platform =
    typeof navigator === "undefined"
      ? ""
      : ((navigator as Navigator & { userAgentData?: { platform?: string } })
          .userAgentData?.platform ?? navigator.platform)
  return /mac|iphone|ipad/i.test(platform) ? "⌘K" : "Ctrl K"
}

export interface NavbarSearchTriggerProps {
  /** `field` reads as a search box (desktop); `icon` is a square action. */
  variant: "field" | "icon"
  onOpen: () => void
}

/** Opens the navbar surface search (`SurfaceSearchDialog`). */
export function NavbarSearchTrigger({
  variant,
  onOpen,
}: NavbarSearchTriggerProps) {
  const { t } = useTranslation("nav")
  const label = t("search.trigger")

  if (variant === "icon") {
    return (
      <button
        type="button"
        aria-label={label}
        aria-keyshortcuts="Meta+K Control+K"
        onClick={onOpen}
        className={navTriggerClass}
      >
        <SearchIcon className="size-4 shrink-0" aria-hidden />
      </button>
    )
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-keyshortcuts="Meta+K Control+K"
      onClick={onOpen}
      className="inline-flex h-9 w-52 shrink-0 items-center gap-2 rounded-md border border-border bg-background px-2.5 text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-ring"
    >
      <SearchIcon className="size-4 shrink-0" aria-hidden />
      <span
        className={cn(textVariants({ role: "compact" }), "flex-1 text-left")}
      >
        {t("search.trigger_field")}
      </span>
      <kbd
        className={cn(
          textVariants({ role: "data", tone: "muted" }),
          "rounded border border-border bg-muted px-1.5 py-0.5"
        )}
      >
        {shortcutLabel()}
      </kbd>
    </button>
  )
}
