import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Folder,
  Loader2,
  Play,
  Search,
  Server,
  ShieldAlert,
  TerminalSquare,
  XCircle,
} from "lucide-react"
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  type CommandModule,
  type CommandRequest,
  useRunCommand,
} from "@/components/features/commands/hooks/useRunCommand"
import { useDevicesList } from "@/components/features/inventory/hooks/useDevices"
import { useGroupsList } from "@/components/features/inventory/hooks/useGroups"
import type { RunSelection } from "@/components/features/playbooks/hooks/useRunPlaybook"
import { AppProviders } from "@/components/providers/app-providers"
import { RunHostConsole } from "@/components/shared/run-host-console"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

type ToggleRowProps = {
  name: string
  description?: string | null
  icon: typeof Server
  selected: boolean
  onToggle: () => void
  disabled?: boolean
}

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

function CommandsPageInner() {
  const { t } = useTranslation("commands")
  const { data: groups = [] } = useGroupsList()
  const { data: devices = [] } = useDevicesList()
  const { phase, events, result, errorMessage, start, reset } = useRunCommand()

  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set())
  const [inventorySearch, setInventorySearch] = useState("")
  const [groupsExpanded, setGroupsExpanded] = useState(true)
  const [devicesExpanded, setDevicesExpanded] = useState(false)
  const [command, setCommand] = useState("uptime")
  const [module, setModule] = useState<CommandModule>("shell")
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
  const trimmedCommand = command.trim()
  const canRun =
    trimmedCommand.length > 0 && selectionCount > 0 && phase !== "running"
  const isRunning = phase === "running"

  function toggle(set: Set<string>, id: string): Set<string> {
    const next = new Set(set)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  }

  function handleRun() {
    if (!canRun) return
    const inventory: RunSelection[] = [
      ...[...selectedGroups].map((id) => ({ id, type: "group" as const })),
      ...[...selectedDevices].map((id) => ({ id, type: "device" as const })),
    ]
    const body: CommandRequest = {
      inventory,
      command: trimmedCommand,
      module,
      become,
      forks,
    }
    void start(body)
  }

  const MODULES = [
    {
      value: "command" as const,
      label: t("module.command"),
      hint: t("module.command_hint"),
    },
    {
      value: "shell" as const,
      label: t("module.shell"),
      hint: t("module.shell_hint"),
    },
  ]

  return (
    <main className="flex h-[calc(100dvh-3.5rem)] w-full min-h-0 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b px-6 py-3">
        <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
          <TerminalSquare className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold leading-tight">
            {t("page.title")}
          </h1>
          <p className="text-muted-foreground text-xs">{t("page.subtitle")}</p>
        </div>
        {phase !== "idle" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            disabled={isRunning}
          >
            {t("actions.new_run")}
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
              <span className="text-zinc-600">{module}</span>
              <span className="mx-1.5 text-zinc-700">{become ? "#" : "$"}</span>
              <span className="text-zinc-400">{trimmedCommand || "—"}</span>
            </span>
          </div>

          <div
            ref={terminalRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5"
          >
            <RunHostConsole
              phase={phase}
              events={events}
              idlePrompt={t("console.idle_prompt")}
            />
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
                {t("result.finished_with_status", {
                  status: result.status,
                  rc: result.rc ?? "?",
                })}
              </span>
            </div>
          ) : null}
        </div>

        {/* ── Options panel ── */}
        <div className="flex w-80 shrink-0 flex-col gap-5 overflow-y-auto border-l p-4">
          {/* Inventory */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                {t("panel.inventory")}
              </p>
              {selectionCount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGroups(new Set())
                    setSelectedDevices(new Set())
                  }}
                  disabled={isRunning}
                  className="text-muted-foreground hover:text-foreground text-[11px] transition-colors disabled:opacity-50"
                >
                  {t("panel.clear", { count: selectionCount })}
                </button>
              ) : null}
            </div>

            {groups.length > 0 || devices.length > 0 ? (
              <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                <Input
                  type="search"
                  placeholder={t("panel.search_placeholder")}
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  disabled={isRunning}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            ) : null}

            {groups.length > 0 ? (
              <InventoryCollapsible
                title={t("panel.groups")}
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
                    {t("panel.no_results")}
                  </p>
                )}
              </InventoryCollapsible>
            ) : null}

            {devices.length > 0 ? (
              <InventoryCollapsible
                title={t("panel.devices")}
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
                    {t("panel.no_results")}
                  </p>
                )}
              </InventoryCollapsible>
            ) : null}

            {groups.length === 0 && devices.length === 0 ? (
              <p className="text-muted-foreground px-2 text-xs">
                {t("panel.empty_inventory")}
              </p>
            ) : searchQuery &&
              filteredGroups.length === 0 &&
              filteredDevices.length === 0 ? (
              <p className="text-muted-foreground px-2 text-xs">
                {t("panel.no_match")}
              </p>
            ) : null}
          </div>

          {/* Command + module + become */}
          <div className="space-y-3 border-t pt-3">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              {t("panel.command_section")}
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="cmd-text" className="text-xs">
                {t("panel.command")}
              </Label>
              <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1.5 left-3 font-mono text-xs select-none">
                  {become ? "#" : "$"}
                </span>
                <textarea
                  id="cmd-text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  disabled={isRunning}
                  rows={3}
                  spellCheck={false}
                  className="border-input bg-transparent ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border py-1.5 pr-3 pl-6 font-mono text-xs shadow-xs focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder={t("panel.command_placeholder")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t("panel.module")}</Label>
              <ModulePicker
                value={module}
                onChange={setModule}
                disabled={isRunning}
                modules={MODULES}
              />
            </div>

            <div className="flex items-start justify-between gap-2 rounded-md border p-2.5">
              <div className="min-w-0">
                <Label
                  htmlFor="cmd-become"
                  className="flex items-center gap-1.5 text-xs"
                >
                  <ShieldAlert className="size-3.5" />
                  {t("panel.become")}
                </Label>
                <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                  {t("panel.become_hint")}
                </p>
              </div>
              <Switch
                id="cmd-become"
                checked={become}
                onCheckedChange={setBecome}
                disabled={isRunning}
              />
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="cmd-forks" className="w-14 shrink-0 text-xs">
                {t("panel.forks")}
              </Label>
              <Input
                id="cmd-forks"
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
                  {t("actions.running")}
                </>
              ) : (
                <>
                  <Play className="size-4" />
                  {t("actions.run")}
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

function ModulePicker({
  value,
  onChange,
  disabled,
  modules,
}: {
  value: CommandModule
  onChange: (next: CommandModule) => void
  disabled?: boolean
  modules: { value: CommandModule; label: string; hint: string }[]
}) {
  const active = modules.find((m) => m.value === value) ?? modules[0]
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        {modules.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            disabled={disabled}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              value === m.value
                ? "border-primary bg-primary/10 text-foreground"
                : "border-input text-muted-foreground hover:bg-accent"
            )}
          >
            <TerminalSquare className="size-3.5" />
            {m.label}
          </button>
        ))}
      </div>
      <p className="text-muted-foreground text-[11px] leading-snug">
        {active.hint}
      </p>
    </div>
  )
}

export function CommandsPage() {
  return (
    <AppProviders>
      <CommandsPageInner />
    </AppProviders>
  )
}
