import type { ElementType, ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function StatCard({
  icon: Icon,
  title,
  value,
  sub,
  href,
}: {
  icon: ElementType
  title: string
  value: number | string
  sub?: ReactNode
  href: string
}) {
  return (
    <a href={href} className="group block">
      <Card className="h-full transition-colors group-hover:bg-accent/30">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <CardTitle className="type-label text-muted-foreground">
            {title}
          </CardTitle>
          <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
            <Icon className="size-4" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-3xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          {sub && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {sub}
            </p>
          )}
        </CardContent>
      </Card>
    </a>
  )
}
