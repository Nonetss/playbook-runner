import { getIcon } from "@/lib/icon-registry"

const ArrowLeft = getIcon("navigation", "back")

import type { ReactNode } from "react"
import { Text } from "@/components/shared/brand/typography"
import {
  PageShell,
  type PageShellMaxWidth,
} from "@/components/shared/layout/page-shell"
import { AppLink } from "@/components/ui/app-link"
import { cn } from "@/lib/utils"

/**
 * Frame for detail and form routes: a status-role back link above the
 * page content (which starts with `PageHero`). Replaces hand-built `<main>`
 * headers with their own title sizes.
 */
export function DetailFrame({
  backHref,
  backLabel,
  maxWidth = "6xl",
  className,
  children,
}: {
  backHref: string
  backLabel: ReactNode
  maxWidth?: PageShellMaxWidth
  className?: string
  children: ReactNode
}) {
  return (
    <PageShell maxWidth={maxWidth} className={cn("gap-0", className)}>
      <AppLink
        href={backHref}
        className="inline-flex w-fit items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3" aria-hidden />
        <Text variant="status">{backLabel}</Text>
      </AppLink>
      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-6">{children}</div>
    </PageShell>
  )
}
