import { ChevronLeft, ChevronRight } from "lucide-react"
import { type KeyboardEvent, useState } from "react"
import { cn } from "@/lib/utils"

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function wrap(value: number, min: number, max: number) {
  const span = max - min + 1
  return min + ((((value - min) % span) + span) % span)
}

/**
 * Compact numeric control for cron time fields. It accepts typed input and
 * wraps at the boundaries, so changing an hour never alters the rest of the
 * cron expression.
 */
export function NumberStepper({
  label,
  value,
  min,
  max,
  onChange,
  decreaseLabel,
  increaseLabel,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  decreaseLabel: string
  increaseLabel: string
}) {
  const [draft, setDraft] = useState<string | null>(null)

  const commit = (next: number) => onChange(wrap(next, min, max))

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowUp":
      case "ArrowRight":
        event.preventDefault()
        commit(value + 1)
        break
      case "ArrowDown":
      case "ArrowLeft":
        event.preventDefault()
        commit(value - 1)
        break
      case "PageUp":
        event.preventDefault()
        commit(value + 5)
        break
      case "PageDown":
        event.preventDefault()
        commit(value - 5)
        break
      case "Home":
        event.preventDefault()
        commit(min)
        break
      case "End":
        event.preventDefault()
        commit(max)
        break
      case "Enter":
        event.preventDefault()
        event.currentTarget.blur()
        break
    }
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: this control needs a custom input-and-buttons layout.
    <div
      role="group"
      aria-label={label}
      onWheel={(event) => {
        event.preventDefault()
        commit(value + (event.deltaY < 0 ? 1 : -1))
      }}
      className="flex h-9 items-center rounded-md border border-input bg-transparent"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={`${label}: ${decreaseLabel}`}
        onClick={() => commit(value - 1)}
        className="flex h-full w-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={draft ?? String(value).padStart(2, "0")}
        onChange={(event) => {
          setDraft(event.target.value.replace(/\D/g, "").slice(0, 2))
        }}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={() => {
          if (draft !== null && draft !== "") {
            commit(clamp(Number(draft), min, max))
          }
          setDraft(null)
        }}
        onKeyDown={handleKeyDown}
        className="w-full min-w-0 flex-1 rounded-sm border-0 bg-transparent text-center font-mono text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={`${label}: ${increaseLabel}`}
        onClick={() => commit(value + 1)}
        className="flex h-full w-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight className="size-3.5" />
      </button>
    </div>
  )
}

/**
 * Compact single-choice grid for the weekday and day-of-month fields. It is
 * the same direct-selection pattern used by the cron form in stack.
 */
export function SegmentedPicker<T extends string>({
  label,
  options,
  value,
  onChange,
  columns,
  mono = false,
}: {
  label: string
  options: readonly { value: T; label: string; title?: string }[]
  value: T
  onChange: (value: T) => void
  columns: number
  mono?: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const selected = option.value === value

        return (
          // biome-ignore lint/a11y/useSemanticElements: the custom cell treatment needs button semantics with radio state.
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-8 items-center justify-center rounded-md border text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
              mono && "font-mono tabular-nums",
              selected
                ? "border-foreground bg-foreground text-background"
                : "border-input text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
