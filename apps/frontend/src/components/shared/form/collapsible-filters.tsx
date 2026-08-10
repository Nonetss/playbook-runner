import { FilterX, SlidersHorizontal } from "lucide-react"
import { Children, type ReactNode, useState } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const columnsClass: Record<1 | 2 | 3, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
}

export function FilterField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

/** Collapsed filter controls with an optional active-count and clear action. */
export function CollapsibleFilters({
  title,
  activeLabel,
  activeCount = 0,
  onClear,
  clearLabel,
  columns = 3,
  count,
  defaultOpen = false,
  children,
  className,
}: {
  title: string
  activeLabel?: (count: number) => string
  activeCount?: number
  onClear?: () => void
  clearLabel: string
  columns?: 1 | 2 | 3
  count?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}) {
  const [expanded, setExpanded] = useState(defaultOpen)
  const fieldCount = Math.min(3, Math.max(1, Children.count(children)))
  const effectiveColumns = Math.min(columns, fieldCount) as 1 | 2 | 3
  const hasActive = activeCount > 0

  return (
    <div className={cn("space-y-3", className)}>
      <Accordion
        type="single"
        collapsible
        value={expanded ? "filters" : ""}
        onValueChange={(value) => setExpanded(value === "filters")}
      >
        <AccordionItem value="filters" className="border-b-0">
          <AccordionTrigger className="min-h-11 py-2 hover:no-underline">
            <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" />
              {title}
              {hasActive && activeLabel ? (
                <span className="text-xs font-normal tabular-nums text-muted-foreground">
                  {activeLabel(activeCount)}
                </span>
              ) : null}
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-2">
            <div className="space-y-3">
              <div
                className={cn(
                  "grid min-w-0 gap-3",
                  columnsClass[effectiveColumns]
                )}
              >
                {children}
              </div>
              {hasActive && onClear ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={onClear}
                  >
                    <FilterX className="size-4" />
                    {clearLabel}
                  </Button>
                </div>
              ) : null}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      {count ? <p className="text-xs text-muted-foreground">{count}</p> : null}
    </div>
  )
}
