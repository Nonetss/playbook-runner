import { useTranslation } from "react-i18next"
import { Text } from "@/components/shared/brand/typography"
import { CommandFooter } from "@/components/ui/command"
import { Kbd, KbdGroup } from "@/components/ui/kbd"

const KEY_HINTS = [
  { keys: ["↑", "↓"], label: "search.keys.navigate" },
  { keys: ["↵"], label: "search.keys.open" },
  { keys: ["esc"], label: "search.keys.close" },
] as const

/**
 * Legend of the keys the surface search answers to, under its results. Hidden
 * from assistive technology (the list already announces them) and below `sm`,
 * where the dialog is driven by touch.
 */
export function SurfaceSearchFooter() {
  const { t } = useTranslation("nav")
  return (
    <CommandFooter aria-hidden className="hidden sm:flex">
      {KEY_HINTS.map((hint) => (
        <span key={hint.label} className="inline-flex items-center gap-1.5">
          <KbdGroup>
            {hint.keys.map((key) => (
              <Kbd key={key}>{key}</Kbd>
            ))}
          </KbdGroup>
          <Text variant="compact" tone="muted">
            {t(hint.label)}
          </Text>
        </span>
      ))}
    </CommandFooter>
  )
}
