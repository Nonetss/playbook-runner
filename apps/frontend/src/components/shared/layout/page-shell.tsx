import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const maxWidthClass = {
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
} as const

const paddingClass = {
  page: "p-6 lg:px-8",
  compact: "px-3 py-3 sm:px-6 sm:py-6",
} as const

/** Shared page frame. Providers stay at the Astro island entry point. */
export function PageShell({
  maxWidth = "6xl",
  padding = "page",
  className,
  children,
}: {
  maxWidth?: keyof typeof maxWidthClass
  padding?: keyof typeof paddingClass
  className?: string
  children: ReactNode
}) {
  return (
    <main className={cn("flex min-w-0 flex-1 flex-col", paddingClass[padding])}>
      <div
        className={cn(
          "mx-auto flex w-full min-w-0 flex-1 flex-col",
          maxWidthClass[maxWidth],
          className
        )}
      >
        {children}
      </div>
    </main>
  )
}
