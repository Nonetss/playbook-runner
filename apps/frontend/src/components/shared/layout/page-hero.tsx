import { Fragment, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Text } from "@/components/shared/brand/typography"
import { getSurface, type SurfaceId } from "@/lib/app-surfaces"
import { cn } from "@/lib/utils"

export interface HeroCountSegment {
  count: number
  label: string
}

/**
 * Calm hero counter copy ("3 active · 5 total"): counts in ink, labels
 * muted, hairline separators. Hidden when the last (total) segment is 0.
 */
export function HeroCount({
  segments,
  className,
}: {
  segments: HeroCountSegment[]
  className?: string
}) {
  const total = segments.at(-1)
  if (!total || total.count <= 0) return null

  return (
    <Text
      as="p"
      variant="meta"
      tone="muted"
      className={cn("tabular-nums", className)}
    >
      {segments.map((segment, index) => (
        <Fragment key={segment.label}>
          {index > 0 ? <span className="mx-2 text-border">·</span> : null}
          <span className="text-foreground">{segment.count}</span>{" "}
          {segment.label}
        </Fragment>
      ))}
    </Text>
  )
}

interface PageHeroSharedProps {
  description?: ReactNode
  meta?: ReactNode
  status?: ReactNode
  action?: ReactNode
  children?: ReactNode
  className?: string
}

type PageHeroProps = PageHeroSharedProps &
  (
    | {
        /** Registry entry supplying icon, title and description. `icon`,
         *  `title` and `description` stay overridable (e.g. a detail page
         *  showing the loaded entity's name). */
        surface: SurfaceId
        icon?: ReactNode
        title?: ReactNode
      }
    | {
        surface?: undefined
        icon: ReactNode
        title: ReactNode
      }
  )

/** The one page header: flat accent icon, display title, meta description
 *  and right-aligned meta/status/action slots. */
export function PageHero(props: PageHeroProps) {
  const { t } = useTranslation("nav")
  const { description, meta, status, action, children, className } = props
  const surface = props.surface ? getSurface(props.surface) : undefined
  const SurfaceIcon = surface?.icon

  const icon =
    props.icon ?? (SurfaceIcon ? <SurfaceIcon className="size-5" /> : null)
  const title = props.title ?? (surface ? t(surface.titleKey) : null)
  const resolvedDescription =
    description ?? (surface ? t(surface.descriptionKey) : null)
  const rightItemCount = [meta, status, action].filter(Boolean).length

  return (
    <header className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon ? (
            <div className="flex size-5 shrink-0 items-center justify-center text-primary [&_svg]:size-5">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <Text as="h1" variant="display" className="truncate">
              {title}
            </Text>
            {resolvedDescription ? (
              <Text as="p" variant="meta" tone="muted" className="mt-0.5">
                {resolvedDescription}
              </Text>
            ) : null}
          </div>
        </div>
        {rightItemCount > 0 ? (
          <div
            className={cn(
              "flex w-full min-w-0 flex-wrap items-center gap-3 sm:ml-auto sm:w-auto sm:justify-end",
              rightItemCount > 1 ? "justify-between" : "justify-end"
            )}
          >
            {meta}
            {status}
            {action}
          </div>
        ) : null}
      </div>
      {children ? <div className="w-full">{children}</div> : null}
    </header>
  )
}
