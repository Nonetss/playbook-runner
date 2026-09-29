import type { ReactNode } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

/** Inline switch row of the run side panel (e.g. sudo). */
export function RunSwitchOption({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string
  label: ReactNode
  hint?: ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-normal">
          {label}
        </Label>
        {hint ? (
          <p className="mt-0.5 text-meta text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  )
}

/** Forks (parallelism) input of the run side panel, clamped to ≥ 1. */
export function RunForksOption({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string
  label: ReactNode
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="text-sm font-normal">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={1}
        max={50}
        value={value}
        onChange={(e) =>
          onChange(Math.max(1, Number.parseInt(e.target.value, 10) || 1))
        }
        disabled={disabled}
        className="h-9 w-20 font-mono text-xs tabular-nums"
      />
    </div>
  )
}
