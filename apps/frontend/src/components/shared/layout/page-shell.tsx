import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const maxWidthClass = {
  "3xl": "max-w-3xl",
  "6xl": "max-w-6xl",
  full: "max-w-none",
} as const

/**
 * Width frame for a page. The layout's `<main>` owns the padding and the
 * scroller, so this renders a plain block and never a second `<main>`.
 */
export function PageShell({
  maxWidth = "6xl",
  className,
  children,
}: {
  maxWidth?: keyof typeof maxWidthClass
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-0 w-full min-w-0 flex-1 flex-col gap-6",
        maxWidthClass[maxWidth],
        className
      )}
    >
      {children}
    </div>
  )
}
