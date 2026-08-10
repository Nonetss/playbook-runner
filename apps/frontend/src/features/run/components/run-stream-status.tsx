import { getIcon } from "@/lib/icon-registry"

const AlertTriangle = getIcon("status", "alert")
const Loader2 = getIcon("status", "loading")
const XCircle = getIcon("status", "error")

import { Button } from "@/components/ui/button"

type StreamPhase = "idle" | "running" | "done" | "error" | "cancelled"

const TERMINAL_STATUS = "border-zinc-800/80 bg-zinc-900/60 text-zinc-300"
const TERMINAL_ERROR = "border-red-900/50 bg-red-950/40 text-red-400"

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
  variant = "default",
}: {
  phase: StreamPhase
  errorMessage?: string | null
  labels: RunStreamStatusLabels
  onStopWatching?: () => void
  variant?: "default" | "terminal"
}) {
  const statusClass =
    variant === "terminal" ? TERMINAL_STATUS : "border-border bg-muted/20"
  const statusTextClass =
    variant === "terminal" ? "text-zinc-400" : "text-muted-foreground"
  const cancelledIconClass =
    variant === "terminal" ? "text-zinc-500" : "text-muted-foreground"
  const errorClass =
    variant === "terminal"
      ? TERMINAL_ERROR
      : "border-destructive/40 bg-destructive/10 text-destructive"

  if (phase === "running") {
    return (
      <div
        className={`mx-3 mb-3 flex shrink-0 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs sm:mx-5 sm:mb-4 ${statusClass}`}
        aria-live="polite"
      >
        <span className={`flex min-w-0 items-center gap-2 ${statusTextClass}`}>
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
        className={`mx-3 mb-3 flex shrink-0 items-start gap-2 rounded-lg border px-3 py-2 text-xs sm:mx-5 sm:mb-4 ${statusClass}`}
        role="status"
      >
        <AlertTriangle
          className={`mt-0.5 size-3.5 shrink-0 ${cancelledIconClass}`}
        />
        <span className="min-w-0">
          <span className="block font-medium">{labels.stoppedWatching}</span>
          <span className={`block ${statusTextClass}`}>
            {labels.serverMayStillBeRunning}
          </span>
        </span>
      </div>
    )
  }

  if (phase === "error") {
    return (
      <div
        className={`mx-3 mb-3 flex shrink-0 items-start gap-2 rounded-lg border px-3 py-2 text-xs sm:mx-5 sm:mb-4 ${errorClass}`}
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
