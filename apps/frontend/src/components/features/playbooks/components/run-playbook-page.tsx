import {
  AlertTriangle,
  ArrowLeft,
  BookText,
  Check,
  CheckCircle2,
  ChevronDown,
  Folder,
  Loader2,
  Pencil,
  Play,
  Plus,
  Search,
  Server,
  Trash2,
  XCircle,
} from "lucide-react"
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useDevicesList } from "@/components/features/inventory/hooks/useDevices"
import { useGroupsList } from "@/components/features/inventory/hooks/useGroups"
import { PlaybookSwitcher } from "@/components/features/playbooks/components/playbook-switcher"
import { usePlaybookGet } from "@/components/features/playbooks/hooks/usePlaybooks"
import {
  type RunEvent,
  type RunSelection,
  useRunPlaybook,
} from "@/components/features/playbooks/hooks/useRunPlaybook"
import { AppProviders } from "@/components/providers/app-providers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRunInventorySelection } from "@/hooks/useRunInventorySelection"
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

function describeEvent(
  event: RunEvent,
  t: (key: string) => string
): TerminalLine[] {
  switch (event.event) {
    case "playbook_on_start":
      return lines({
        text: sep(t("console.headings.playbook")),
        tone: "header",
      })

    case "playbook_on_play_start":
      return lines(
        { text: "", tone: "dim" },
        {
          text: sep(`${t("console.headings.play")} [${event.play ?? ""}]`),
          tone: "header",
        }
      )

    case "playbook_on_task_start": {
      const label = `${t("console.headings.task")} [${event.task ?? ""}]`
      return lines(
        { text: "", tone: "dim" },
        { text: sep(label, "-"), tone: "muted" }
      )
    }

    case "runner_on_start":
      return lines({
        text: `  → [${event.host ?? ""}] ${t("console.runner.starting")}`,
        tone: "dim",
      })

    case "runner_on_ok": {
      const result: TerminalLine[] = event.changed
        ? [
            {
              text: `${t("console.runner.changed")}: [${event.host ?? ""}]`,
              tone: "changed",
            },
          ]
        : [
            {
              text: `${t("console.runner.ok")}: [${event.host ?? ""}]`,
              tone: "ok",
            },
          ]
      if (event.stdout) {
        for (const line of event.stdout.split("\n")) {
          if (line) result.push({ text: `  ${line}`, tone: "dim" })
        }
      }
      return result
    }

    case "runner_on_skipped":
      return lines({
        text: `${t("console.runner.skipping")}: [${event.host ?? ""}]`,
        tone: "muted",
      })

    case "runner_on_failed": {
      const result: TerminalLine[] = [
        {
          text: `${t("console.runner.fatal")}: [${event.host ?? ""}]: ${t("console.runner.failed_excl")}!`,
          tone: "fail",
        },
      ]
      if (event.msg) {
        result.push({
          text: `  ${t("console.runner.msg")}: ${event.msg}`,
          tone: "fail",
        })
      }
      if (event.rc != null) {
        result.push({
          text: `  ${t("console.runner.rc")}: ${event.rc}`,
          tone: "fail",
        })
      }
      if (event.stdout) {
        result.push({ text: `  ${t("console.runner.stdout")}:`, tone: "muted" })
        for (const line of event.stdout.split("\n")) {
          if (line) result.push({ text: `    ${line}`, tone: "dim" })
        }
      }
      if (event.stderr) {
        result.push({ text: `  ${t("console.runner.stderr")}:`, tone: "fail" })
        for (const line of event.stderr.split("\n")) {
          if (line) result.push({ text: `    ${line}`, tone: "fail" })
        }
      }
      return result
    }

    case "runner_on_unreachable": {
      const result: TerminalLine[] = [
        {
          text: `${t("console.runner.fatal")}: [${event.host ?? ""}]: ${t("console.runner.unreachable")}!`,
          tone: "fail",
        },
      ]
      if (event.msg) {
        result.push({
          text: `  ${t("console.runner.msg")}: ${event.msg}`,
          tone: "fail",
        })
      }
      return result
    }

    case "runner_item_on_ok":
      return lines({
        text: event.changed
          ? `  ${t("console.runner.changed")}: [${event.host ?? ""}] (${t("console.runner.item")})`
          : `  ${t("console.runner.ok")}: [${event.host ?? ""}] (${t("console.runner.item")})`,
        tone: event.changed ? "changed" : "ok",
      })

    case "runner_item_on_failed":
      return lines({
        text: `  ${t("console.runner.failed_lower")}: [${event.host ?? ""}] (${t("console.runner.item")}) — ${event.msg ?? ""}`,
        tone: "fail",
      })

    case "playbook_on_stats": {
      if (!event.stats)
        return lines(
          { text: "", tone: "dim" },
          { text: sep(t("console.headings.recap")), tone: "header" }
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
        { text: sep(t("console.headings.recap")), tone: "header" },
      ]

      for (const host of hosts) {
        const o = ok[host] ?? 0
        const c = changed[host] ?? 0
        const f = failures[host] ?? 0
        const d = dark[host] ?? 0
        const s = skipped[host] ?? 0
        const tone: Tone = f > 0 || d > 0 ? "fail" : c > 0 ? "changed" : "ok"
        const stats = `${t("console.runner.ok")}=${o}  ${t("console.runner.changed")}=${c}  ${t("console.runner.unreachable_lower")}=${d}  ${t("console.runner.failed_lower")}=${f}  ${t("console.runner.skipped")}=${s}`
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
  children: ReactNode
}

function InventoryCollapsible({
  title,
  count,
  selectedCount,
  expanded,
  onToggle,
  children,
}: InventoryCollapsibleProps) {
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        className="hover:bg-accent flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors"
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
        className="hover:bg-accent flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors"
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

// ── RunPlaybookPageInner ──────────────────────────────────────────────────────

function RunPlaybookPageInner({ id }: { id: string }) {
  const { t } = useTranslation("playbooks")
  const { data: playbook } = usePlaybookGet(id)
  const { data: groups = [], isPending: groupsLoading } = useGroupsList()
  const { data: devices = [], isPending: devicesLoading } = useDevicesList()
  const { phase, events, result, errorMessage, start, reset } = useRunPlaybook()

  const inventoryReady = !groupsLoading && !devicesLoading
  const {
    selectedGroups,
    setSelectedGroups,
    selectedDevices,
    setSelectedDevices,
  } = useRunInventorySelection({
    groups,
    devices,
    ready: inventoryReady,
  })
  const [inventorySearch, setInventorySearch] = useState("")
  const [groupsExpanded, setGroupsExpanded] = useState(true)
  const [devicesExpanded, setDevicesExpanded] = useState(false)
  const [forks, setForks] = useState(1)
  const [extravars, setExtravars] = useState<{ key: string; value: string }[]>(
    []
  )

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

  function toggle(set: Set<string>, id: string): Set<string> {
    const next = new Set(set)
    next.has(id) ? next.delete(id) : next.add(id)
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
    start(playbook.id, inventory, { forks, extravars: extravarMap })
  }

  // Flatten all events into a single ordered list of terminal lines.
  const terminalLines = useMemo(
    () => events.flatMap((event) => describeEvent(event, t)),
    [events, t]
  )

  return (
    <main className="flex h-[calc(100dvh-3.5rem)] w-full min-h-0 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b px-6 py-3">
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          aria-label={t("run.back_aria")}
        >
          <a href="/playbooks">
            <ArrowLeft className="size-4" />
          </a>
        </Button>
        <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
          <BookText className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold leading-tight">
            {t("run.header_subtitle")}
          </h1>
          <div className="mt-1.5">
            <PlaybookSwitcher currentId={id} disabled={isRunning} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {playbook ? (
            <Button asChild variant="outline" size="sm">
              <a href={`/playbooks/${id}/edit`} aria-label={t("run.edit_aria")}>
                <Pencil className="size-4" />
                {t("run.edit")}
              </a>
            </Button>
          ) : null}
          {phase !== "idle" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              disabled={isRunning}
            >
              {t("run.new_run")}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ── Terminal ── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950 p-5">
          <div
            ref={terminalRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain font-mono text-xs leading-[1.6]"
          >
            {phase === "idle" ? (
              <p className="select-none text-zinc-600">
                {t("run.idle_prompt")}
              </p>
            ) : terminalLines.length === 0 && isRunning ? (
              <p className="flex items-center gap-2 text-zinc-500">
                <Loader2 className="size-3 animate-spin" />
                {t("run.starting")}
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
            <div className="mt-3 flex shrink-0 items-start gap-2 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-xs text-red-400">
              <XCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {phase === "done" && result ? (
            <div
              className={cn(
                "mt-3 flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs",
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
                {t("run.result_finished_with_status", {
                  status: result.status,
                  rc: result.rc ?? "?",
                })}
              </span>
            </div>
          ) : null}
        </div>

        {/* ── Options panel ── */}
        <div className="flex w-72 shrink-0 flex-col gap-5 overflow-y-auto border-l p-4">
          {/* Inventory */}
          <div className="space-y-3">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              {t("run.panel.inventory")}
            </p>

            {groups.length > 0 || devices.length > 0 ? (
              <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                <Input
                  type="search"
                  placeholder={t("run.panel.search_placeholder")}
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            ) : null}

            {groups.length > 0 ? (
              <InventoryCollapsible
                title={t("run.panel.groups")}
                count={filteredGroups.length}
                selectedCount={
                  filteredGroups.filter((g) => selectedGroups.has(g.id)).length
                }
                expanded={searchQuery ? true : groupsExpanded}
                onToggle={() => setGroupsExpanded((v) => !v)}
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
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground px-2 py-1 text-xs">
                    {t("run.panel.no_results")}
                  </p>
                )}
              </InventoryCollapsible>
            ) : null}

            {devices.length > 0 ? (
              <InventoryCollapsible
                title={t("run.panel.devices")}
                count={filteredDevices.length}
                selectedCount={
                  filteredDevices.filter((d) => selectedDevices.has(d.id))
                    .length
                }
                expanded={searchQuery ? true : devicesExpanded}
                onToggle={() => setDevicesExpanded((v) => !v)}
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
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground px-2 py-1 text-xs">
                    {t("run.panel.no_results")}
                  </p>
                )}
              </InventoryCollapsible>
            ) : null}

            {groups.length === 0 && devices.length === 0 ? (
              <p className="text-muted-foreground px-2 text-xs">
                {t("run.panel.empty_inventory")}
              </p>
            ) : searchQuery &&
              filteredGroups.length === 0 &&
              filteredDevices.length === 0 ? (
              <p className="text-muted-foreground px-2 text-xs">
                {t("run.panel.no_match")}
              </p>
            ) : null}
          </div>

          {/* Options */}
          <div className="space-y-3 border-t pt-3">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              {t("run.panel.options")}
            </p>

            <div className="flex items-center gap-2">
              <Label htmlFor="run-forks" className="w-14 shrink-0 text-xs">
                {t("run.panel.forks")}
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
                className="h-7 w-20 text-xs"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium">{t("run.panel.extravars")}</p>
              {extravars.map((entry, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: order-stable list
                <div key={i} className="flex items-center gap-1.5">
                  <Input
                    placeholder={t("run.panel.extravars_key_placeholder")}
                    value={entry.key}
                    onChange={(e) =>
                      setExtravars((prev) =>
                        prev.map((x, j) =>
                          j === i ? { ...x, key: e.target.value } : x
                        )
                      )
                    }
                    className="h-7 font-mono text-xs"
                  />
                  <Input
                    placeholder={t("run.panel.extravars_value_placeholder")}
                    value={entry.value}
                    onChange={(e) =>
                      setExtravars((prev) =>
                        prev.map((x, j) =>
                          j === i ? { ...x, value: e.target.value } : x
                        )
                      )
                    }
                    className="h-7 font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    aria-label={t("run.panel.extravars_remove_aria")}
                    onClick={() =>
                      setExtravars((prev) => prev.filter((_, j) => j !== i))
                    }
                  >
                    <Trash2 className="text-muted-foreground size-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() =>
                  setExtravars((prev) => [...prev, { key: "", value: "" }])
                }
              >
                <Plus className="size-3" />
                {t("run.panel.extravars_add")}
              </Button>
            </div>
          </div>

          {/* Run button */}
          <div className="mt-auto border-t pt-4">
            <Button
              className="w-full"
              onClick={handleRun}
              disabled={isRunning || selectionCount === 0 || !playbook}
            >
              {isRunning ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("run.running")}
                </>
              ) : (
                <>
                  <Play className="size-4" />
                  {t("run.run_button")}
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

export function RunPlaybookPage({ id }: { id?: string }) {
  const { t } = useTranslation("playbooks")
  if (!id) {
    return (
      <AppProviders>
        <main className="flex flex-1 items-center justify-center p-6">
          <p className="text-muted-foreground text-sm">
            {t("run.playbook_not_found")}
          </p>
        </main>
      </AppProviders>
    )
  }
  return (
    <AppProviders>
      <RunPlaybookPageInner id={id} />
    </AppProviders>
  )
}
