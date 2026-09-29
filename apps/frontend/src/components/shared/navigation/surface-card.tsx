import { getIcon } from "@/lib/icon-registry"

const ChevronRight = getIcon("controls", "right")

import { useTranslation } from "react-i18next"
import { Text } from "@/components/shared/brand/typography"
import { AppLink } from "@/components/ui/app-link"
import { getSurface, type SurfaceId } from "@/lib/app-surfaces"
import { cn } from "@/lib/utils"

/** Registry-driven destination tile for section overviews. */
export function SurfaceCard({
  surface,
  className,
}: {
  surface: SurfaceId
  className?: string
}) {
  const { t } = useTranslation("nav")
  const item = getSurface(surface)
  const Icon = item.icon

  return (
    <AppLink
      href={item.href}
      className={cn(
        "group dash-enter flex min-w-0 items-start gap-2.5 rounded-xl border bg-card/40 p-4 outline-none",
        "transition-colors duration-200 hover:border-foreground/15 hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className
      )}
    >
      <Icon className="size-5 shrink-0 text-primary" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Text as="h2" variant="headline" className="truncate text-sm">
          {t(item.titleKey)}
        </Text>
        <Text
          as="p"
          variant="meta"
          tone="muted"
          className="line-clamp-2 min-h-[2.9em]"
        >
          {t(item.descriptionKey)}
        </Text>
      </div>
      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-foreground"
      />
    </AppLink>
  )
}

export function SurfaceCardGrid({
  surfaces,
  className,
}: {
  surfaces: readonly SurfaceId[]
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3",
        className
      )}
    >
      {surfaces.map((surface) => (
        <SurfaceCard key={surface} surface={surface} />
      ))}
    </div>
  )
}
