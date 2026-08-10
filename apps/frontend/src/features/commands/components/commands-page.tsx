import { getIcon } from "@/lib/icon-registry"

const AlertTriangle = getIcon("status", "alert")
const CheckCircle2 = getIcon("status", "success")
const Loader2 = getIcon("status", "loading")
const Play = getIcon("actions", "play")
const ShieldAlert = getIcon("status", "warning")
const TerminalSquare = getIcon("resources", "terminalSquare")

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useDevicesList } from "@/features/inventory/hooks/useDevices"
import { useGroupsList } from "@/features/inventory/hooks/useGroups"
import { InventorySelectionList } from "@/features/run/components/inventory-selection-list"
import { RunHostConsole } from "@/features/run/components/run-host-console"
import { RunStreamStatus } from "@/features/run/components/run-stream-status"
import {
  type CommandModule,
  type CommandRequest,
  useRunCommand,
} from "@/features/run/hooks/useRunCommand"
import type { RunSelection } from "@/features/run/types"
import { useConfirm } from "@/hooks/useConfirm"
import { cn } from "@/lib/utils"

function CommandsPageInner() {
  const { t } = useTranslation("commands")
  const { data: groups = [] } = useGroupsList()
  const { data: devices = [] } = useDevicesList()
  const { phase, events, result, errorMessage, start, stopWatching, reset } =
    useRunCommand()
  const confirm = useConfirm()

  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set())
  const [command, setCommand] = useState("uptime")
  const [module, setModule] = useState<CommandModule>("shell")
  const [become, setBecome] = useState(false)
  const [forks, setForks] = useState(1)

  const selectionCount = selectedGroups.size + selectedDevices.size
  const trimmedCommand = command.trim()
  const canRun =
    trimmedCommand.length > 0 && selectionCount > 0 && phase !== "running"
  const isRunning = phase === "running"

  async function handleRun() {
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

    const targetNames = [
      ...groups
        .filter((group) => selectedGroups.has(group.id))
        .map((g) => g.name),
      ...devices
        .filter((device) => selectedDevices.has(device.id))
        .map((d) => d.name),
    ]
    const targetSummary =
      targetNames.length > 4
        ? `${targetNames.slice(0, 4).join(", ")} +${targetNames.length - 4}`
        : targetNames.join(", ")
    const confirmed = await confirm({
      title: t("confirm.title"),
      description: t("confirm.description", {
        command: trimmedCommand,
        module,
        targets: targetSummary,
        count: selectionCount,
        forks,
        become: become ? t("confirm.with_sudo") : t("confirm.without_sudo"),
      }),
      confirmLabel: t("confirm.run"),
      cancelLabel: t("confirm.cancel"),
    })
    if (!confirmed) return

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
            <span className="ml-2 truncate font-mono type-console-meta text-zinc-500">
              <span className="text-zinc-600">{module}</span>
              <span className="mx-1.5 text-zinc-700">{become ? "#" : "$"}</span>
              <span className="text-zinc-400">{trimmedCommand || "—"}</span>
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <RunHostConsole
              phase={phase}
              events={events}
              idlePrompt={t("console.idle_prompt")}
            />
          </div>

          {/* Result / error banners */}
          <RunStreamStatus
            phase={phase}
            errorMessage={errorMessage}
            onStopWatching={stopWatching}
            labels={{
              connecting: t("run_status.connecting"),
              stopWatching: t("run_status.stop_watching"),
              stoppedWatching: t("run_status.stopped_watching"),
              serverMayStillBeRunning: t(
                "run_status.server_may_still_be_running"
              ),
              connectionError: t("run_status.connection_error"),
            }}
          />

          {phase === "done" && result ? (
            <div
              className={cn(
                "mx-5 mb-4 flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs",
                result.ok
                  ? "border-border bg-muted/20 text-foreground"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
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
              <p className="text-muted-foreground type-label">
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
                  className="type-meta text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  {t("panel.clear", { count: selectionCount })}
                </button>
              ) : null}
            </div>

            <InventorySelectionList
              groups={groups}
              devices={devices}
              selectedGroups={selectedGroups}
              selectedDevices={selectedDevices}
              onToggleGroup={(groupId) =>
                setSelectedGroups((current) => {
                  const next = new Set(current)
                  next.has(groupId) ? next.delete(groupId) : next.add(groupId)
                  return next
                })
              }
              onToggleDevice={(deviceId) =>
                setSelectedDevices((current) => {
                  const next = new Set(current)
                  next.has(deviceId)
                    ? next.delete(deviceId)
                    : next.add(deviceId)
                  return next
                })
              }
              labels={{
                groups: t("panel.groups"),
                devices: t("panel.devices"),
                searchPlaceholder: t("panel.search_placeholder"),
                noResults: t("panel.no_results"),
                emptyInventory: t("panel.empty_inventory"),
                noMatch: t("panel.no_match"),
              }}
              searchable
              collapsible
              disabled={isRunning}
            />
          </div>

          {/* Command + module + become */}
          <div className="space-y-3 border-t pt-3">
            <p className="text-muted-foreground type-label">
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
                <p className="type-meta text-muted-foreground mt-0.5">
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
                  setForks(
                    Math.max(1, Number.parseInt(e.target.value, 10) || 1)
                  )
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
      <p className="type-meta text-muted-foreground">{active.hint}</p>
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
