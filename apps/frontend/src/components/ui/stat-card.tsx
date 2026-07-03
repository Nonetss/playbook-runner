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
      <Card className="transition-all group-hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
            <Icon className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </CardContent>
      </Card>
    </a>
  )
}
