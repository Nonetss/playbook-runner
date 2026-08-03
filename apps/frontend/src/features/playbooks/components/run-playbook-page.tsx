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
import { AppProviders } from "@/components/providers/app-providers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDevicesList } from "@/features/inventory/hooks/useDevices"
import { useGroupsList } from "@/features/inventory/hooks/useGroups"
import { PlaybookSwitcher } from "@/features/playbooks/components/playbook-switcher"
import { usePlaybookGet } from "@/features/playbooks/hooks/usePlaybooks"
import { PlaybookRunConsole } from "@/features/run/components/playbook-run-console"
import { useRunInventorySelection } from "@/features/run/hooks/useRunInventorySelection"
import { useRunPlaybook } from "@/features/run/hooks/useRunPlaybook"
import type { RunSelection } from "@/features/run/types"
import { cn } from "@/lib/utils"

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
        className="hover:bg-accent flex min-h-11 w-full items-center gap-1.5 rounded-md px-2 py-2.5 text-left transition-colors lg:min-h-0 lg:py-1.5"
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
        className="hover:bg-accent flex min-h-11 w-full items-center gap-2.5 rounded-md px-2 py-2.5 text-left text-sm transition-colors lg:min-h-0 lg:py-1.5"
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

  return (
    <main className="flex h-[calc(100dvh-var(--navbar-height))] w-full min-h-0 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-3 sm:px-6">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="size-10 shrink-0 sm:size-8"
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
        <div className="flex w-full shrink-0 gap-2 sm:ml-auto sm:w-auto">
          {playbook ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="min-h-10 flex-1 sm:min-h-8 sm:flex-none"
            >
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
              className="min-h-10 flex-1 sm:min-h-8 sm:flex-none"
              onClick={reset}
              disabled={isRunning}
            >
              {t("run.new_run")}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* ── Terminal ── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950">
          {/* Faux terminal title bar */}
          <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800/80 px-3 py-2 sm:px-4">
            <span className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-red-500/80" />
              <span className="size-2.5 rounded-full bg-amber-500/80" />
              <span className="size-2.5 rounded-full bg-emerald-500/80" />
            </span>
            <span className="ml-2 truncate font-mono text-[11px] text-zinc-500">
              <span className="text-zinc-600">playbook</span>
              <span className="mx-1.5 text-zinc-700">$</span>
              <span className="text-zinc-400">{playbook?.name ?? "—"}</span>
            </span>
          </div>

          <div
            ref={terminalRef}
            className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3 sm:p-5"
          >
            <PlaybookRunConsole
              events={events}
              running={isRunning}
              idlePrompt={t("run.idle_prompt")}
            />
          </div>

          {/* Result / error banners */}
          {phase === "error" ? (
            <div className="mx-3 mb-3 flex shrink-0 items-start gap-2 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-xs text-red-400 sm:mx-5 sm:mb-4">
              <XCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {phase === "done" && result ? (
            <div
              className={cn(
                "mx-3 mb-3 flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs sm:mx-5 sm:mb-4",
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
        <div className="flex h-[45%] min-h-56 max-h-80 shrink-0 flex-col gap-4 overflow-y-auto border-t p-3 sm:gap-5 sm:p-4 lg:h-auto lg:min-h-0 lg:max-h-none lg:w-72 lg:border-t-0 lg:border-l">
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
                  className="h-10 pl-8 text-xs lg:h-8"
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
                  setForks(
                    Math.max(1, Number.parseInt(e.target.value, 10) || 1)
                  )
                }
                className="h-10 w-24 text-xs lg:h-7 lg:w-20"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium">{t("run.panel.extravars")}</p>
              {extravars.map((entry, i) => (
                <div key={i} className="flex min-w-0 items-center gap-1.5">
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
                    className="h-10 min-w-0 flex-1 font-mono text-xs lg:h-7"
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
                    className="h-10 min-w-0 flex-1 font-mono text-xs lg:h-7"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-10 shrink-0 lg:size-7"
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
                className="h-10 text-xs lg:h-7"
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
              className="min-h-11 w-full"
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
