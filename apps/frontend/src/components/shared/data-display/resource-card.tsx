import type { ComponentProps, ReactNode } from "react"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * Shared resource-card shell. Feature cards own their domain content and
 * actions; this component keeps the repeated paper, icon-well, and header
 * rhythm consistent across resource grids.
 */
export function ResourceCard({
  icon,
  title,
  description,
  actions,
  iconClassName,
  descriptionClassName,
  contentClassName,
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Card>, "children"> & {
  icon: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  iconClassName?: string
  descriptionClassName?: string
  contentClassName?: string
  children?: ReactNode
}) {
  return (
    <Card className={cn("h-full gap-4 py-4", className)} {...props}>
      <CardHeader className="px-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md",
              iconClassName
            )}
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1 overflow-hidden">
            <CardTitle className="truncate text-base">{title}</CardTitle>
            {description ? (
              <CardDescription className={cn("truncate", descriptionClassName)}>
                {description}
              </CardDescription>
            ) : null}
          </div>
        </div>
        {actions ? <CardAction>{actions}</CardAction> : null}
      </CardHeader>
      {children ? (
        <CardContent className={cn("px-4", contentClassName)}>
          {children}
        </CardContent>
      ) : null}
    </Card>
  )
}
