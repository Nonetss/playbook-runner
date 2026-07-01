// Live console + run page for the Scripts feature.
//
// TODO: this page duplicates the event-describing helpers, terminal styling,
// and inventory picker layout from `run-playbook-page.tsx` and
// `commands-page.tsx`. Tracked to be refactored into a shared `<RunConsole>`
// plus a single useRun* SSE helper in a follow-up; for now this change copies
// them like the commands page did, to keep the run flows independent.

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Folder,
  Loader2,
  Play,
  Search,
  Server,
  XCircle,
} from "lucide-react"
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { useDevicesList } from "@/components/features/inventory/hooks/useDevices"
import { useGroupsList } from "@/components/features/inventory/hooks/useGroups"
import type {
  RunEvent,
  RunSelection,
} from "@/components/features/playbooks/hooks/useRunPlaybook"
import {
  type ScriptRequest,
  useRunScript,
} from "@/components/features/scripts/hooks/useRunScript"
import { useScriptGet } from "@/components/features/scripts/hooks/useScripts"
import { AppProviders } from "@/components/providers/app-providers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

// ── terminal ──────────────────────────────────────────────────────────────────

type Tone = "ok" | "changed" | "fail" | "muted" | "info" | "header" | "dim"
type TerminalLine = { text: string; tone: Tone }

function sep(label: string, char = "*") {
  const prefix = `${label} `
  const fill = char.repeat(Math.max(0, 72 - prefix.length))
  return `${prefix}${fill}`
}

function lines(...items: TerminalLine[]): TerminalLine[] {
  return items
}

// NOTE: keep parity with run-playbook-page / commands-page `describeEvent`.
function describeEvent(event: RunEvent): TerminalLine[] {
  switch (event.event) {
    case "playbook_on_start":
      return lines({ text: sep("PLAYBOOK"), tone: "header" })

    case "playbook_on_play_start":
      return lines(
        { text: "", tone: "dim" },
        { text: sep(`PLAY [${event.play ?? ""}]`), tone: "header" }
      )

    case "playbook_on_task_start": {
      const label = event.task_action
        ? `TASK [${event.task ?? ""}]`
        : `TASK [${event.task ?? ""}]`
      return lines(
        { text: "", tone: "dim" },
        { text: sep(label, "-"), tone: "muted" }
      )
    }

    case "runner_on_start":
      return lines({ text: `  → [${event.host ?? ""}] iniciando`, tone: "dim" })

    case "runner_on_ok": {
      const result: TerminalLine[] = event.changed
        ? [{ text: `changed: [${event.host ?? ""}]`, tone: "changed" }]
        : [{ text: `ok: [${event.host ?? ""}]`, tone: "ok" }]
      if (event.stdout) {
        for (const line of event.stdout.split("\n")) {
          if (line) result.push({ text: `  ${line}`, tone: "dim" })
        }
      }
      return result
    }

    case "runner_on_skipped":
      return lines({ text: `skipping: [${event.host ?? ""}]`, tone: "muted" })

    case "runner_on_failed": {
      const result: TerminalLine[] = [
        { text: `fatal: [${event.host ?? ""}]: FAILED!`, tone: "fail" },
      ]
      if (event.msg) {
        result.push({ text: `  msg: ${event.msg}`, tone: "fail" })
      }
      if (event.rc != null) {
        result.push({ text: `  rc: ${event.rc}`, tone: "fail" })
      }
      if (event.stdout) {
        result.push({ text: "  stdout:", tone: "muted" })
        for (const line of event.stdout.split("\n")) {
          if (line) result.push({ text: `    ${line}`, tone: "dim" })
        }
      }
      if (event.stderr) {
        result.push({ text: "  stderr:", tone: "fail" })
        for (const line of event.stderr.split("\n")) {
          if (line) result.push({ text: `    ${line}`, tone: "fail" })
        }
      }
      return result
    }

    case "runner_on_unreachable": {
      const result: TerminalLine[] = [
        { text: `fatal: [${event.host ?? ""}]: UNREACHABLE!`, tone: "fail" },
      ]
      if (event.msg) {
        result.push({ text: `  msg: ${event.msg}`, tone: "fail" })
      }
      return result
    }

    case "runner_item_on_ok":
      return lines({
        text: event.changed
          ? `  changed: [${event.host ?? ""}] (item)`
          : `  ok: [${event.host ?? ""}] (item)`,
        tone: event.changed ? "changed" : "ok",
      })

    case "runner_item_on_failed":
      return lines({
        text: `  failed: [${event.host ?? ""}] (item) — ${event.msg ?? ""}`,
        tone: "fail",
      })

    case "playbook_on_stats": {
      if (!event.stats)
        return lines(
          { text: "", tone: "dim" },
          { text: sep("PLAY RECAP"), tone: "header" }
        )

      const { ok, changed, failures, dark, skipped } = event.stats
      const hosts = Array.from(
        new Set([
          ...Object.keys(ok),
          ...Object.keys(changed),
          ...Object.keys(failures),
          ...Object.keys(dark),
          ...Object.keys(skipped),
        ])
      ).sort()

      const result: TerminalLine[] = [
        { text: "", tone: "dim" },
        { text: sep("PLAY RECAP"), tone: "header" },
      ]

      for (const host of hosts) {
        const o = ok[host] ?? 0
        const c = changed[host] ?? 0
        const f = failures[host] ?? 0
        const d = dark[host] ?? 0
        const s = skipped[host] ?? 0
        const tone: Tone = f > 0 || d > 0 ? "fail" : c > 0 ? "changed" : "ok"
        const stats = `ok=${o}  changed=${c}  unreachable=${d}  failed=${f}  skipped=${s}`
        result.push({
          text: `${host.padEnd(36)}: ${stats}`,
          tone,
        })
      }

      return result
    }

    default:
      return []
  }
}

const toneClass: Record<Tone, string> = {
  header: "text-zinc-100 font-semibold",
  ok: "text-emerald-400",
  changed: "text-amber-400",
  fail: "text-red-400",
  info: "text-zinc-300",
  muted: "text-zinc-400",
  dim: "text-zinc-600",
}

// ── InventoryCollapsible ──────────────────────────────────────────────────────

type InventoryCollapsibleProps = {
  title: string
  count: number
  selectedCount: number
  expanded: boolean
  onToggle: () => void
  disabled?: boolean
  children: ReactNode
}

function InventoryCollapsible({
  title,
  count,
  selectedCount,
  expanded,
  onToggle,
  disabled,
  children,
}: InventoryCollapsibleProps) {
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className="hover:bg-accent flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ChevronDown
          className={cn(
            "text-muted-foreground size-3.5 shrink-0 transition-transform",
            !expanded && "-rotate-90"
          )}
        />
        <span className="min-w-0 flex-1 text-xs font-medium">{title}</span>
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {selectedCount > 0 ? `${selectedCount}/` : ""}
          {count}
        </span>
      </button>
      {expanded ? children : null}
    </div>
  )
}

function matchesInventorySearch(
  query: string,
  ...fields: (string | null | undefined)[]
): boolean {
  if (!query) return true
  return fields.some((field) => field?.toLowerCase().includes(query))
}

// ── ToggleRow ─────────────────────────────────────────────────────────────────

type ToggleRowProps = {
  name: string
  description?: string | null
  icon: typeof Server
  selected: boolean
  onToggle: () => void
  disabled?: boolean
}

function ToggleRow({
  name,
  description,
  icon: Icon,
  selected,
  onToggle,
  disabled,
}: ToggleRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className="hover:bg-accent flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          className={cn(
            "flex size-3.5 shrink-0 items-center justify-center rounded-sm border",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input"
          )}
        >
          {selected ? <Check className="size-2.5" /> : null}
        </span>
        <Icon className="text-muted-foreground size-3.5 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium leading-tight">
            {name}
          </span>
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

// ── RunScriptPageInner ────────────────────────────────────────────────────────

function RunScriptPageInner({ id }: { id: string }) {
  const { data: script, isPending: scriptLoading } = useScriptGet(id)
  const { data: groups = [] } = useGroupsList()
  const { data: devices = [] } = useDevicesList()
  const { phase, events, result, errorMessage, start, reset } = useRunScript()

  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set())
  const [inventorySearch, setInventorySearch] = useState("")
  const [groupsExpanded, setGroupsExpanded] = useState(true)
  const [devicesExpanded, setDevicesExpanded] = useState(false)
  const [become, setBecome] = useState(false)
  const [forks, setForks] = useState(1)

  const searchQuery = inventorySearch.trim().toLowerCase()

  const filteredGroups = useMemo(
    () =>
      groups.filter((group) =>
        matchesInventorySearch(searchQuery, group.name, group.description)
      ),
    [groups, searchQuery]
  )

  const filteredDevices = useMemo(
    () =>
      devices.filter((device) =>
        matchesInventorySearch(searchQuery, device.name, device.ipAddress)
      ),
    [devices, searchQuery]
  )

  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = terminalRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [events.length])

  const selectionCount = selectedGroups.size + selectedDevices.size
  const isRunning = phase === "running"
  const canRun = !!script && selectionCount > 0 && phase !== "running"

  function toggle(set: Set<string>, id: string): Set<string> {
    const next = new Set(set)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  }

  function handleRun() {
    if (!script || selectionCount === 0) return
    const inventory: RunSelection[] = [
      ...[...selectedGroups].map((id) => ({ id, type: "group" as const })),
      ...[...selectedDevices].map((id) => ({ id, type: "device" as const })),
    ]
    const body: ScriptRequest = {
      scriptId: script.id,
      inventory,
      become,
      forks,
    }
    void start(body)
  }

  const terminalLines = useMemo(() => events.flatMap(describeEvent), [events])

  return (
    <main className="flex h-[calc(100dvh-3.5rem)] w-full min-h-0 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b px-6 py-3">
        <Button asChild variant="ghost" size="icon-sm" aria-label="Volver">
          <a href="/scripts">
            <ArrowLeft className="size-4" />
          </a>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-semibold leading-tight">
              {scriptLoading
                ? "Cargando…"
                : (script?.name ?? "Script no encontrado")}
            </h1>
            {script && !scriptLoading ? (
              <Badge variant="secondary" className="font-mono text-xs">
                {script.language ?? "bash"}
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-xs">Ejecución del script</p>
        </div>
        {phase !== "idle" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            disabled={isRunning}
          >
            Nueva ejecución
          </Button>
        ) : null}
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ── Terminal ── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950">
          {/* Faux terminal title bar */}
          <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800/80 px-4 py-2">
            <span className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-red-500/80" />
              <span className="size-2.5 rounded-full bg-amber-500/80" />
              <span className="size-2.5 rounded-full bg-emerald-500/80" />
            </span>
            <span className="ml-2 truncate font-mono text-[11px] text-zinc-500">
              <span className="text-zinc-600">script</span>
              <span className="mx-1.5 text-zinc-700">{become ? "#" : "$"}</span>
              <span className="text-zinc-400">
                {scriptLoading ? "…" : (script?.name ?? "—")}
              </span>
            </span>
          </div>

          <div
            ref={terminalRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 font-mono text-xs leading-[1.6]"
          >
            {phase === "idle" ? (
              <p className="select-none text-zinc-600">
                Configura el inventario y pulsa{" "}
                <span className="text-zinc-400">Ejecutar</span> para ver la
                salida aquí.
              </p>
            ) : terminalLines.length === 0 && isRunning ? (
              <p className="flex items-center gap-2 text-zinc-500">
                <Loader2 className="size-3 animate-spin" />
                Iniciando ejecución…
              </p>
            ) : (
              terminalLines.map((line, i) => (
                <p
                  // biome-ignore lint/suspicious/noArrayIndexKey: append-only log
                  key={i}
                  className={cn("whitespace-pre-wrap", toneClass[line.tone])}
                >
                  {line.text || " "}
                </p>
              ))
            )}

            {isRunning ? (
              <span className="mt-1 inline-block animate-pulse text-zinc-400">
                ▋
              </span>
            ) : null}
          </div>

          {/* Result / error banners */}
          {phase === "error" ? (
            <div className="mx-5 mb-4 flex shrink-0 items-start gap-2 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-xs text-red-400">
              <XCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {phase === "done" && result ? (
            <div
              className={cn(
                "mx-5 mb-4 flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs",
                result.ok
                  ? "border-emerald-900/50 bg-emerald-950/40 text-emerald-400"
                  : "border-amber-900/50 bg-amber-950/40 text-amber-400"
              )}
            >
              {result.ok ? (
                <CheckCircle2 className="size-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="size-3.5 shrink-0" />
              )}
              <span>
                Ejecución finalizada — estado{" "}
                <span className="font-semibold">{result.status}</span> (rc=
                {result.rc ?? "?"})
              </span>
            </div>
          ) : null}
        </div>

        {/* ── Options panel ── */}
        <div className="flex w-72 shrink-0 flex-col gap-5 overflow-y-auto border-l p-4">
          {/* Inventory */}
          <div className="space-y-3">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Inventario
            </p>

            {groups.length > 0 || devices.length > 0 ? (
              <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                <Input
                  type="search"
                  placeholder="Buscar…"
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  disabled={isRunning}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            ) : null}

            {groups.length > 0 ? (
              <InventoryCollapsible
                title="Grupos"
                count={filteredGroups.length}
                selectedCount={
                  filteredGroups.filter((g) => selectedGroups.has(g.id)).length
                }
                expanded={groupsExpanded}
                onToggle={() => setGroupsExpanded((v) => !v)}
                disabled={isRunning}
              >
                {filteredGroups.length > 0 ? (
                  <ul className="space-y-0.5 pl-1">
                    {filteredGroups.map((group) => (
                      <ToggleRow
                        key={group.id}
                        name={group.name}
                        description={group.description}
                        icon={Folder}
                        selected={selectedGroups.has(group.id)}
                        onToggle={() =>
                          setSelectedGroups((s) => toggle(s, group.id))
                        }
                        disabled={isRunning}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground px-2 py-1 text-xs">
                    Sin resultados
                  </p>
                )}
              </InventoryCollapsible>
            ) : null}

            {devices.length > 0 ? (
              <InventoryCollapsible
                title="Dispositivos"
                count={filteredDevices.length}
                selectedCount={
                  filteredDevices.filter((d) => selectedDevices.has(d.id))
                    .length
                }
                expanded={devicesExpanded}
                onToggle={() => setDevicesExpanded((v) => !v)}
                disabled={isRunning}
              >
                {filteredDevices.length > 0 ? (
                  <ul className="space-y-0.5 pl-1">
                    {filteredDevices.map((device) => (
                      <ToggleRow
                        key={device.id}
                        name={device.name}
                        description={device.ipAddress}
                        icon={Server}
                        selected={selectedDevices.has(device.id)}
                        onToggle={() =>
                          setSelectedDevices((s) => toggle(s, device.id))
                        }
                        disabled={isRunning}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground px-2 py-1 text-xs">
                    Sin resultados
                  </p>
                )}
              </InventoryCollapsible>
            ) : null}

            {groups.length === 0 && devices.length === 0 ? (
              <p className="text-muted-foreground px-2 text-xs">
                No hay inventario. Crea grupos o dispositivos primero.
              </p>
            ) : searchQuery &&
              filteredGroups.length === 0 &&
              filteredDevices.length === 0 ? (
              <p className="text-muted-foreground px-2 text-xs">
                Ningún grupo ni dispositivo coincide con la búsqueda.
              </p>
            ) : null}
          </div>

          {/* Options */}
          <div className="space-y-3 border-t pt-3">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Opciones
            </p>

            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="script-become" className="text-xs">
                Become (sudo)
              </Label>
              <Switch
                id="script-become"
                checked={become}
                onCheckedChange={setBecome}
                disabled={isRunning}
              />
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="script-forks" className="w-14 shrink-0 text-xs">
                Forks
              </Label>
              <Input
                id="script-forks"
                type="number"
                min={1}
                max={500}
                value={forks}
                onChange={(e) =>
                  setForks(Math.max(1, Number.parseInt(e.target.value) || 1))
                }
                disabled={isRunning}
                className="h-7 w-20 text-xs"
              />
            </div>
          </div>

          {/* Run button */}
          <div className="mt-auto border-t pt-4">
            <Button className="w-full" onClick={handleRun} disabled={!canRun}>
              {isRunning ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Ejecutando…
                </>
              ) : (
                <>
                  <Play className="size-4" />
                  Ejecutar
                  {selectionCount > 0 ? (
                    <Badge variant="secondary" className="ml-1">
                      {selectionCount}
                    </Badge>
                  ) : null}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}

export function RunScriptPage({ id }: { id?: string }) {
  if (!id) {
    return (
      <AppProviders>
        <main className="flex flex-1 items-center justify-center p-6">
          <p className="text-muted-foreground text-sm">Script no encontrado.</p>
        </main>
      </AppProviders>
    )
  }
  return (
    <AppProviders>
      <RunScriptPageInner id={id} />
    </AppProviders>
  )
}
