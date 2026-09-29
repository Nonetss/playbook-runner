import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
  icon?: ReactNode
}

/**
 * Radio group of short, finite options. Selected is inverted ink — never
 * terracotta. `mono` sets options in the data role (e.g. languages, windows).
 */
export function SegmentedPicker<T extends string>({
  value,
  onChange,
  options,
  disabled = false,
  mono = false,
  ariaLabel,
  className,
}: {
  value: T
  onChange: (next: T) => void
  options: readonly SegmentedOption<T>[]
  disabled?: boolean
  mono?: boolean
  ariaLabel?: string
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("grid auto-cols-fr grid-flow-col gap-1", className)}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          // biome-ignore lint/a11y/useSemanticElements: a styled radio button group keeps the segmented look
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-3.5",
              mono && "font-mono font-normal",
              selected
                ? "border-foreground bg-foreground text-background"
                : "border-input text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
