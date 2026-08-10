import { getIcon } from "@/lib/icon-registry"

const AlertTriangle = getIcon("status", "alert")
const CheckCircle2 = getIcon("status", "success")
const Loader2 = getIcon("status", "loading")
const RefreshCw = getIcon("actions", "refresh")

import { useEffect, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { InventoryDevice } from "@/features/inventory/types"
import { RunStreamStatus } from "@/features/run/components/run-stream-status"
import { usePingDevice } from "@/features/run/hooks/use-ping-device"
import type { RunEvent } from "@/features/run/types"
import { cn } from "@/lib/utils"

type PingDeviceModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  device: InventoryDevice | null
}

type Tone = "ok" | "changed" | "fail" | "muted" | "info"

type EventLabels = {
  playStarted: string
  task: string
  changed: string
  ok: string
  skipped: string
  failed: string
  unreachable: string
  summary: string
}

function describeEvent(
  event: RunEvent,
  labels: EventLabels
): { text: string; tone: Tone } | null {
  const host = event.host ? `${event.host}: ` : ""
  switch (event.event) {
    case "playbook_on_play_start":
      return { text: labels.playStarted, tone: "info" }
    case "playbook_on_task_start":
      return { text: `· ${event.task ?? labels.task}`, tone: "muted" }
    case "runner_on_ok":
      return event.changed
        ? { text: `${host}${labels.changed}`, tone: "changed" }
        : { text: `${host}${labels.ok}`, tone: "ok" }
    case "runner_on_skipped":
      return { text: `${host}${labels.skipped}`, tone: "muted" }
    case "runner_on_failed":
      return {
        text: `${host}${labels.failed} — ${event.msg ?? ""}`.trim(),
        tone: "fail",
      }
    case "runner_on_unreachable":
      return {
        text: `${host}${labels.unreachable} — ${event.msg ?? ""}`.trim(),
        tone: "fail",
      }
    case "playbook_on_stats":
      return { text: labels.summary, tone: "info" }
    default:
      return null
  }
}

const toneClass: Record<Tone, string> = {
  ok: "text-foreground",
  changed: "text-destructive",
  fail: "text-destructive",
  info: "text-foreground",
  muted: "text-muted-foreground",
}

export function PingDeviceModal({
  open,
  onOpenChange,
  device,
}: PingDeviceModalProps) {
  const { t } = useTranslation("inventory")
  const { phase, events, result, errorMessage, start, stopWatching, reset } =
    usePingDevice()
  const consoleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !device) return
    reset()
    start(device.id)
  }, [open, device?.id])

  useEffect(() => {
    const el = consoleRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [events.length])

  const isRunning = phase === "running"
  const eventLabels: EventLabels = {
    playStarted: t("ping.event_play_started"),
    task: t("ping.event_task_default"),
    changed: t("ping.event_changed"),
    ok: t("ping.event_ok"),
    skipped: t("ping.event_skipped"),
    failed: t("ping.event_failed"),
    unreachable: t("ping.event_unreachable"),
    summary: t("ping.event_summary"),
  }

  const visibleEvents = useMemo(
    () =>
      events
        .map((event) => describeEvent(event, eventLabels))
        .filter((e) => e !== null),
    [events, eventLabels]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("ping.title", { name: device?.name })}</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {device?.ipAddress}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div
            ref={consoleRef}
            className="bg-muted/40 max-h-72 overflow-y-auto rounded-lg border p-3 font-mono text-xs"
          >
            {visibleEvents.length === 0 && isRunning ? (
              <p className="text-muted-foreground flex items-center gap-2">
                <Loader2 className="size-3 animate-spin" />
                {t("ping.connecting_local")}
              </p>
            ) : (
              visibleEvents.map((line, i) => (
                <p
                  key={i}
                  className={cn("whitespace-pre-wrap", toneClass[line.tone])}
                >
                  {line.text}
                </p>
              ))
            )}
          </div>

          <RunStreamStatus
            phase={phase}
            errorMessage={errorMessage}
            onStopWatching={stopWatching}
            labels={{
              connecting: t("ping.connecting"),
              stopWatching: t("ping.stop_watching"),
              stoppedWatching: t("ping.stopped_watching"),
              serverMayStillBeRunning: t("ping.server_may_still_be_running"),
              connectionError: t("ping.connection_error"),
            }}
          />

          {phase === "done" && result ? (
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                result.ok
                  ? "border-border bg-muted/20 text-foreground"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              )}
            >
              {result.ok ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <AlertTriangle className="size-4 shrink-0" />
              )}
              <span>
                {result.ok ? t("ping.result_ok") : t("ping.result_failed")} —{" "}
                {t("ping.result_status")}{" "}
                <span className="font-medium">{result.status}</span> (rc=
                {result.rc ?? "?"})
              </span>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          {!isRunning && device ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                start(device.id)
              }}
            >
              <RefreshCw className="size-4" />
              {t("ping.retry")}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={isRunning}
            onClick={() => onOpenChange(false)}
          >
            {isRunning ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("ping.running_close")}
              </>
            ) : (
              t("ping.close")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
