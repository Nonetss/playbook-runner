import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const maxWidthClass = {
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  /** Full width on mobile and tablet; capped at 80% from `lg`. */
  "80%": "lg:max-w-[80%]",
  /** Fill the inset: tables, editors, consoles. */
  full: "max-w-none",
} as const

export type PageShellMaxWidth = keyof typeof maxWidthClass

/**
 * Width frame for a page. `6xl` for lists and overviews, `80%` for section
 * overviews, `4xl`/`3xl` for single-column forms and profile, `full` for
 * tables, editors and consoles. The layout's `<main>` owns the padding and
 * the scroller (`padding="compact"` on the layout for dense tables), so this
 * renders a plain block and never a second `<main>`.
 */
export function PageShell({
  maxWidth = "6xl",
  className,
  children,
}: {
  maxWidth?: PageShellMaxWidth
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
