import { getIcon } from "@/lib/icon-registry"

const AlertTriangle = getIcon("status", "alert")
const Loader2 = getIcon("status", "loading")
const XCircle = getIcon("status", "error")

import { Button } from "@/components/ui/button"
import type { RunPhase } from "@/features/run/types"

export type RunStreamStatusLabels = {
  connecting: string
  stopWatching: string
  stoppedWatching: string
  serverMayStillBeRunning: string
  connectionError: string
}

/**
 * Communicates the difference between stopping the browser stream and
 * stopping the server-side execution. The latter requires a backend API and
 * is intentionally not implied here.
 */
export function RunStreamStatus({
  phase,
  errorMessage,
  labels,
  onStopWatching,
}: {
  phase: RunPhase
  errorMessage?: string | null
  labels: RunStreamStatusLabels
  onStopWatching?: () => void
}) {
  if (phase === "running") {
    return (
      <div
        className="mx-3 mb-3 flex shrink-0 items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs sm:mx-5 sm:mb-4"
        aria-live="polite"
      >
        <span className="text-muted-foreground flex min-w-0 items-center gap-2">
          <Loader2 className="size-3.5 shrink-0 animate-spin" />
          <span className="truncate">{labels.connecting}</span>
        </span>
        {onStopWatching ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={onStopWatching}
          >
            {labels.stopWatching}
          </Button>
        ) : null}
      </div>
    )
  }

  if (phase === "cancelled") {
    return (
      <div
        className="mx-3 mb-3 flex shrink-0 items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs sm:mx-5 sm:mb-4"
        role="status"
      >
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0">
          <span className="block font-medium">{labels.stoppedWatching}</span>
          <span className="text-muted-foreground block">
            {labels.serverMayStillBeRunning}
          </span>
        </span>
      </div>
    )
  }

  if (phase === "error") {
    return (
      <div
        className="mx-3 mb-3 flex shrink-0 items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive sm:mx-5 sm:mb-4"
        role="alert"
      >
        <XCircle className="mt-0.5 size-3.5 shrink-0" />
        <span className="min-w-0 wrap-break-word">
          <span className="font-medium">{labels.connectionError}</span>
          {errorMessage ? ` — ${errorMessage}` : null}
        </span>
      </div>
    )
  }

  return null
}
