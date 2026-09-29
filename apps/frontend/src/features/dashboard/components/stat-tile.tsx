import type { ReactNode } from "react"
import { Text } from "@/components/shared/brand/typography"
import { AppLink } from "@/components/ui/app-link"

/** Dashboard figure: label-role caps, a `stat` number and a meta line. */
export function StatTile({
  title,
  value,
  sub,
  href,
}: {
  title: string
  value: ReactNode
  sub?: ReactNode
  href: string
}) {
  return (
    <AppLink
      href={href}
      className="dash-enter flex min-w-0 flex-col gap-2 rounded-xl border bg-card/40 p-4 transition-colors duration-200 hover:border-foreground/15 hover:bg-muted/40 focus-ring"
    >
      <Text as="p" variant="label" tone="muted">
        {title}
      </Text>
      <Text as="p" variant="stat">
        {value}
      </Text>
      {sub ? (
        <Text as="p" variant="meta" tone="muted">
          {sub}
        </Text>
      ) : null}
    </AppLink>
  )
}
