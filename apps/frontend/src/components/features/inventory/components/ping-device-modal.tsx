import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react"
import { useEffect, useMemo, useRef } from "react"
import {
  type RunEvent,
  usePingDevice,
} from "@/components/features/inventory/hooks/usePingDevice"
import type { InventoryDevice } from "@/components/features/inventory/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type PingDeviceModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  device: InventoryDevice | null
}

type Tone = "ok" | "changed" | "fail" | "muted" | "info"

function describeEvent(event: RunEvent): { text: string; tone: Tone } | null {
  const host = event.host ? `${event.host}: ` : ""
  switch (event.event) {
    case "playbook_on_play_start":
      return { text: "▶ Play iniciado", tone: "info" }
    case "playbook_on_task_start":
      return { text: `· ${event.task ?? "Tarea"}`, tone: "muted" }
    case "runner_on_ok":
      return event.changed
        ? { text: `${host}changed`, tone: "changed" }
        : { text: `${host}ok`, tone: "ok" }
    case "runner_on_skipped":
      return { text: `${host}skipped`, tone: "muted" }
    case "runner_on_failed":
      return { text: `${host}failed — ${event.msg ?? ""}`.trim(), tone: "fail" }
    case "runner_on_unreachable":
      return {
        text: `${host}unreachable — ${event.msg ?? ""}`.trim(),
        tone: "fail",
      }
    case "playbook_on_stats":
      return { text: "■ Resumen", tone: "info" }
    default:
      return null
  }
}

const toneClass: Record<Tone, string> = {
  ok: "text-emerald-600 dark:text-emerald-400",
  changed: "text-amber-600 dark:text-amber-400",
  fail: "text-destructive",
  info: "text-foreground",
  muted: "text-muted-foreground",
}

export function PingDeviceModal({
  open,
  onOpenChange,
  device,
}: PingDeviceModalProps) {
  const { phase, events, result, errorMessage, start, reset } = usePingDevice()
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

  const visibleEvents = useMemo(
    () => events.map(describeEvent).filter((e) => e !== null),
    [events]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ping — {device?.name}</DialogTitle>
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
                Conectando…
              </p>
            ) : (
              visibleEvents.map((line, i) => (
                <p
                  // biome-ignore lint/suspicious/noArrayIndexKey: append-only log
                  key={i}
                  className={cn("whitespace-pre-wrap", toneClass[line.tone])}
                >
                  {line.text}
                </p>
              ))
            )}
          </div>

          {phase === "error" ? (
            <div className="border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2 text-sm">
              <XCircle className="mt-0.5 size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {phase === "done" && result ? (
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                result.ok
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400"
              )}
            >
              {result.ok ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <AlertTriangle className="size-4 shrink-0" />
              )}
              <span>
                {result.ok ? "Host alcanzable" : "Host no alcanzable"} — estado{" "}
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
              Reintentar
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
                Ejecutando…
              </>
            ) : (
              "Cerrar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
