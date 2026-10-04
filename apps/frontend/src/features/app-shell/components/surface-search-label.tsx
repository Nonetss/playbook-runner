import { Fragment } from "react"
import { textVariants } from "@/components/shared/brand/typography"
import { getIcon } from "@/lib/icon-registry"

const ChevronRight = getIcon("controls", "right")

export interface SurfaceSearchLabelProps {
  label: string
  /** Section titles above the result, outermost first. */
  trail?: string[]
}

/**
 * A search result's name preceded by its muted section trail
 * (`Inventario › Dispositivos`), so a sub-page or record reads in context
 * even outside its group, as in "Recientes".
 */
export function SurfaceSearchLabel({ label, trail }: SurfaceSearchLabelProps) {
  if (!trail?.length) return label

  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-1">
      {trail.map((crumb) => (
        <Fragment key={crumb}>
          <span
            className={textVariants({
              role: "compact",
              tone: "muted",
              className: "font-normal",
            })}
          >
            {crumb}
          </span>
          <ChevronRight
            aria-hidden
            className="size-3 shrink-0 text-muted-foreground"
          />
        </Fragment>
      ))}
      <span>{label}</span>
    </span>
  )
}
