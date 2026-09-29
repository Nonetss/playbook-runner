import { getIcon } from "@/lib/icon-registry"

const Loader2 = getIcon("status", "loading")
const Play = getIcon("actions", "play")

import { Button } from "@/components/ui/button"

/** Primary run action of the side panel; shows the selected target count. */
export function RunButton({
  running,
  disabled,
  selectionCount,
  label,
  runningLabel,
  onClick,
}: {
  running: boolean
  disabled: boolean
  selectionCount: number
  label: string
  runningLabel: string
  onClick: () => void
}) {
  return (
    <Button className="min-h-10 w-full" onClick={onClick} disabled={disabled}>
      {running ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {runningLabel}
        </>
      ) : (
        <>
          <Play className="size-4" />
          {label}
          {selectionCount > 0 ? (
            <span className="tabular-nums opacity-80">· {selectionCount}</span>
          ) : null}
        </>
      )}
    </Button>
  )
}
