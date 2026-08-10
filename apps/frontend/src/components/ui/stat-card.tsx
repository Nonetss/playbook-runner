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
      <Card className="relative overflow-hidden transition-all duration-200 group-hover:shadow-lg group-hover:-translate-y-0.5">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <CardTitle className="type-label text-muted-foreground">
            {title}
          </CardTitle>
          <div className="bg-primary/12 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-primary/10">
            <Icon className="size-4.5" />
          </div>
        </CardHeader>
        <CardContent className="relative space-y-2">
          <p className="text-4xl font-bold tracking-tight text-foreground">
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
