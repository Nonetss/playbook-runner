import { getIcon } from "@/lib/icon-registry"

const AlertTriangle = getIcon("status", "alert")
const Loader2 = getIcon("status", "loading")
const XCircle = getIcon("status", "error")

import { Button } from "@/components/ui/button"
import { TerminalBanner } from "@/features/run/components/terminal-frame"

type StreamPhase = "idle" | "running" | "done" | "error" | "cancelled"

export type RunStreamStatusLabels = {
  connecting: string
  stopWatching: string
  stoppedWatching: string
  serverMayStillBeRunning: string
  connectionError: string
  /** Shown instead of `connecting` while a lost stream is being reattached. */
  reconnecting?: string
}

/**
 * Communicates the difference between stopping the browser stream and
 * stopping the server-side execution. The latter requires a backend API and
 * is intentionally not implied here.
 *
 * `terminal` renders inside `TerminalFrame` on terminal tokens; `default`
 * renders on the page theme (e.g. the ping dialog). `reconnecting` keeps the
 * running state but says the stream is being reattached, for callers that
 * reattach on their own (the job run console).
 */
export function RunStreamStatus({
  phase,
  errorMessage,
  labels,
  onStopWatching,
  reconnecting = false,
  variant = "default",
}: {
  phase: StreamPhase
  errorMessage?: string | null
  labels: RunStreamStatusLabels
  onStopWatching?: () => void
  reconnecting?: boolean
  variant?: "default" | "terminal"
}) {
  const runningLabel =
    reconnecting && labels.reconnecting
      ? labels.reconnecting
      : labels.connecting

  if (variant === "terminal") {
    if (phase === "running") {
      return (
        <TerminalBanner
          tone={reconnecting ? "changed" : "muted"}
          icon={<Loader2 className="animate-spin" />}
          action={
            onStopWatching ? (
              <Button
                type="button"
                variant="terminal"
                size="xs"
                onClick={onStopWatching}
              >
                {labels.stopWatching}
              </Button>
            ) : null
          }
        >
          {runningLabel}
        </TerminalBanner>
      )
    }
    if (phase === "cancelled") {
      return (
        <TerminalBanner tone="changed">
          <span className="block font-medium">{labels.stoppedWatching}</span>
          <span className="block text-terminal-muted">
            {labels.serverMayStillBeRunning}
          </span>
        </TerminalBanner>
      )
    }
    if (phase === "error") {
      return (
        <TerminalBanner tone="failed">
          <span className="font-medium">{labels.connectionError}</span>
          {errorMessage ? ` — ${errorMessage}` : null}
        </TerminalBanner>
      )
    }
    return null
  }

  if (phase === "running") {
    return (
      <div
        className="mx-3 mb-3 flex shrink-0 items-center justify-between gap-3 rounded-lg border bg-card/40 px-3 py-2 text-xs sm:mx-5 sm:mb-4"
        aria-live="polite"
      >
        <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
          <Loader2 className="size-3.5 shrink-0 animate-spin" />
          <span className="truncate">{runningLabel}</span>
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
        className="mx-3 mb-3 flex shrink-0 items-start gap-2 rounded-lg border bg-card/40 px-3 py-2 text-xs sm:mx-5 sm:mb-4"
        role="status"
      >
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0">
          <span className="block font-medium">{labels.stoppedWatching}</span>
          <span className="block text-muted-foreground">
            {labels.serverMayStillBeRunning}
          </span>
        </span>
      </div>
    )
  }

  if (phase === "error") {
    return (
      <div
        className="mx-3 mb-3 flex shrink-0 items-start gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-xs text-destructive sm:mx-5 sm:mb-4"
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
