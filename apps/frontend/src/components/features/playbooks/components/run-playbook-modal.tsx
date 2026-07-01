import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Folder,
  Loader2,
  Play,
  Plus,
  Server,
  Trash2,
  XCircle,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useDevicesList } from "@/components/features/inventory/hooks/useDevices"
import { useGroupsList } from "@/components/features/inventory/hooks/useGroups"
import {
  type RunEvent,
  type RunSelection,
  useRunPlaybook,
} from "@/components/features/playbooks/hooks/useRunPlaybook"
import type { Playbook } from "@/components/features/playbooks/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type RunPlaybookModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  playbook: Playbook | null
}

type Tone = "ok" | "changed" | "fail" | "muted" | "info"

function describeEvent(
  event: RunEvent,
  t: (key: string, options?: Record<string, unknown>) => string
): { text: string; tone: Tone } | null {
  const host = event.host ? `${event.host}: ` : ""
  switch (event.event) {
    case "playbook_on_play_start":
      return { text: `▶ ${t("console.runner.play_start")}`, tone: "info" }
    case "playbook_on_task_start":
      return {
        text: `· ${event.task ?? t("console.runner.task_default")}`,
        tone: "muted",
      }
    case "runner_on_ok":
      return event.changed
        ? { text: `${host}${t("console.runner.changed")}`, tone: "changed" }
        : { text: `${host}${t("console.runner.ok")}`, tone: "ok" }
    case "runner_on_skipped":
      return {
        text: `${host}${t("console.runner.skipped")}`,
        tone: "muted",
      }
    case "runner_on_failed":
      return {
        text: `${host}${t("console.runner.failed")} — ${event.msg ?? ""}`.trim(),
        tone: "fail",
      }
    case "runner_on_unreachable":
      return {
        text: `${host}${t("console.runner.unreachable")} — ${event.msg ?? ""}`.trim(),
        tone: "fail",
      }
    case "playbook_on_stats":
      return { text: `■ ${t("console.headings.recap")}`, tone: "info" }
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

type ToggleRowProps = {
  name: string
  description?: string | null
  icon: typeof Server
  selected: boolean
  onToggle: () => void
}

function ToggleRow({
  name,
  description,
  icon: Icon,
  selected,
  onToggle,
}: ToggleRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="hover:bg-accent flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2 text-left text-sm transition-colors"
      >
        <span
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-sm border",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input"
          )}
        >
          {selected ? <Check className="size-3" /> : null}
        </span>
        <Icon className="text-muted-foreground size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          <span className="block truncate font-medium">{name}</span>
          {description ? (
            <span className="text-muted-foreground block truncate text-xs">
              {description}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  )
}

export function RunPlaybookModal({
  open,
  onOpenChange,
  playbook,
}: RunPlaybookModalProps) {
  const { t } = useTranslation("playbooks")
  const { data: groups = [] } = useGroupsList()
  const { data: devices = [] } = useDevicesList()
  const { phase, events, result, errorMessage, start, reset } = useRunPlaybook()

  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set())
  const [forks, setForks] = useState(1)
  const [extravars, setExtravars] = useState<{ key: string; value: string }[]>(
    []
  )

  const consoleRef = useRef<HTMLDivElement>(null)

  // Reset selection and stream state whenever the modal is (re)opened or the
  // target playbook changes.
  useEffect(() => {
    if (!open) return
    setSelectedGroups(new Set())
    setSelectedDevices(new Set())
    setForks(1)
    setExtravars([])
    reset()
  }, [open, playbook?.id, reset])

  // Auto-scroll the console to the latest event.
  useEffect(() => {
    const el = consoleRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [events.length])

  const selectionCount = selectedGroups.size + selectedDevices.size

  function toggle(set: Set<string>, id: string): Set<string> {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  }

  function handleRun() {
    if (!playbook || selectionCount === 0) return
    const inventory: RunSelection[] = [
      ...[...selectedGroups].map((id) => ({ id, type: "group" as const })),
      ...[...selectedDevices].map((id) => ({ id, type: "device" as const })),
    ]
    const extravarMap = Object.fromEntries(
      extravars.filter((e) => e.key.trim()).map((e) => [e.key.trim(), e.value])
    )
    start(playbook.id, inventory, {
      forks,
      extravars: extravarMap,
    })
  }

  const isRunning = phase === "running"
  const visibleEvents = useMemo(
    () => events.map((e) => describeEvent(e, t)).filter((e) => e !== null),
    [events, t]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("run_modal.title", { name: playbook?.name ?? "" })}
          </DialogTitle>
          <DialogDescription>
            {phase === "idle"
              ? t("run_modal.description_idle")
              : t("run_modal.description_running")}
          </DialogDescription>
        </DialogHeader>

        {phase === "idle" ? (
          <div className="space-y-4">
            {groups.length > 0 ? (
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                  {t("run_modal.groups_section")}
                </p>
                <ul className="space-y-1">
                  {groups.map((group) => (
                    <ToggleRow
                      key={group.id}
                      name={group.name}
                      description={group.description}
                      icon={Folder}
                      selected={selectedGroups.has(group.id)}
                      onToggle={() =>
                        setSelectedGroups((s) => toggle(s, group.id))
                      }
                    />
                  ))}
                </ul>
              </div>
            ) : null}

            {devices.length > 0 ? (
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                  {t("run_modal.devices_section")}
                </p>
                <ul className="space-y-1">
                  {devices.map((device) => (
                    <ToggleRow
                      key={device.id}
                      name={device.name}
                      description={device.ipAddress}
                      icon={Server}
                      selected={selectedDevices.has(device.id)}
                      onToggle={() =>
                        setSelectedDevices((s) => toggle(s, device.id))
                      }
                    />
                  ))}
                </ul>
              </div>
            ) : null}

            {groups.length === 0 && devices.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card px-4 py-8 text-center text-sm">
                <p className="text-muted-foreground">
                  {t("run_modal.empty_inventory")}
                </p>
              </div>
            ) : null}

            <div className="space-y-3 border-t pt-3">
              <p className="text-muted-foreground text-xs font-medium uppercase">
                {t("run_modal.options_section")}
              </p>

              <div className="flex items-center gap-3">
                <Label htmlFor="run-forks" className="w-16 shrink-0 text-sm">
                  {t("run_modal.forks")}
                </Label>
                <Input
                  id="run-forks"
                  type="number"
                  min={1}
                  max={500}
                  value={forks}
                  onChange={(e) =>
                    setForks(Math.max(1, Number.parseInt(e.target.value) || 1))
                  }
                  className="w-24"
                />
              </div>

              <div className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium">
                  {t("run_modal.extravars")}
                </p>
                {extravars.map((entry, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: order-stable list
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder={t("run_modal.extravars_key_placeholder")}
                      value={entry.key}
                      onChange={(e) =>
                        setExtravars((prev) =>
                          prev.map((x, j) =>
                            j === i ? { ...x, key: e.target.value } : x
                          )
                        )
                      }
                      className="font-mono text-xs"
                    />
                    <Input
                      placeholder={t("run_modal.extravars_value_placeholder")}
                      value={entry.value}
                      onChange={(e) =>
                        setExtravars((prev) =>
                          prev.map((x, j) =>
                            j === i ? { ...x, value: e.target.value } : x
                          )
                        )
                      }
                      className="font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() =>
                        setExtravars((prev) => prev.filter((_, j) => j !== i))
                      }
                    >
                      <Trash2 className="text-muted-foreground size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setExtravars((prev) => [...prev, { key: "", value: "" }])
                  }
                >
                  <Plus className="size-3" />
                  {t("run_modal.extravars_add")}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              ref={consoleRef}
              className="bg-muted/40 max-h-72 overflow-y-auto rounded-lg border p-3 font-mono text-xs"
            >
              {visibleEvents.length === 0 && isRunning ? (
                <p className="text-muted-foreground flex items-center gap-2">
                  <Loader2 className="size-3 animate-spin" />
                  {t("run_modal.starting")}
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
                  {t("run_modal.result_finished_with_status", {
                    status: result.status,
                    rc: result.rc ?? "?",
                  })}
                </span>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter>
          {phase === "idle" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("run_modal.cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleRun}
                disabled={selectionCount === 0}
              >
                <Play className="size-4" />
                {t("run_modal.run")}
                {selectionCount > 0 ? (
                  <Badge variant="secondary" className="ml-1">
                    {selectionCount}
                  </Badge>
                ) : null}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isRunning}
                onClick={reset}
              >
                {t("run_modal.back")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isRunning}
                onClick={() => onOpenChange(false)}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t("run_modal.running")}
                  </>
                ) : (
                  t("run_modal.close")
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
