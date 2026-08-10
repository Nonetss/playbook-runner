// Live console + run page for the Scripts feature.
//
// TODO: this page duplicates the inventory picker layout from
// `run-playbook-page.tsx` and `commands-page.tsx`. Tracked to be refactored
// into a shared picker plus a single useRun* SSE helper in a follow-up.

import { getIcon } from "@/lib/icon-registry"

const AlertTriangle = getIcon("status", "alert")
const ArrowLeft = getIcon("navigation", "back")
const CheckCircle2 = getIcon("status", "success")
const Loader2 = getIcon("status", "loading")
const Play = getIcon("actions", "play")

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
  type ScriptRequest,
  useRunScript,
} from "@/features/run/hooks/useRunScript"
import type { RunSelection } from "@/features/run/types"
import { useScriptGet } from "@/features/scripts/hooks/useScripts"
import { useConfirm } from "@/hooks/useConfirm"
import { cn } from "@/lib/utils"

// ── RunScriptPageInner ────────────────────────────────────────────────────────

function RunScriptPageInner({ id }: { id: string }) {
  const { t } = useTranslation("scripts")
  const { data: script, isPending: scriptLoading } = useScriptGet(id)
  const { data: groups = [] } = useGroupsList()
  const { data: devices = [] } = useDevicesList()
  const { phase, events, result, errorMessage, start, stopWatching, reset } =
    useRunScript()
  const confirm = useConfirm()

  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set())
  const [become, setBecome] = useState(false)
  const [forks, setForks] = useState(1)

  const selectionCount = selectedGroups.size + selectedDevices.size
  const isRunning = phase === "running"
  const canRun = !!script && selectionCount > 0 && phase !== "running"

  async function handleRun() {
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
      title: t("run.confirm.title", { name: script.name }),
      description: t("run.confirm.description", {
        targets: targetSummary,
        count: selectionCount,
        forks,
        become: become
          ? t("run.confirm.with_sudo")
          : t("run.confirm.without_sudo"),
      }),
      confirmLabel: t("run.confirm.run"),
      cancelLabel: t("run.confirm.cancel"),
    })
    if (!confirmed) return

    void start(body)
  }

  return (
    <main className="flex h-[calc(100dvh-var(--navbar-height))] w-full min-h-0 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b px-3 py-3 sm:px-6">
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          className="size-10 shrink-0 sm:size-8"
          aria-label={t("run.back_aria")}
        >
          <a href="/scripts">
            <ArrowLeft className="size-4" />
          </a>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-semibold leading-tight">
              {scriptLoading
                ? t("run.loading")
                : (script?.name ?? t("run.script_not_found"))}
            </h1>
            {script && !scriptLoading ? (
              <Badge variant="secondary" className="font-mono text-xs">
                {script.language ?? t("card.default_language")}
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-xs">
            {t("run.header_subtitle")}
          </p>
        </div>
        {phase !== "idle" ? (
          <Button
            variant="outline"
            size="sm"
            className="min-h-10 sm:min-h-8"
            onClick={reset}
            disabled={isRunning}
          >
            {t("run.new_run")}
          </Button>
        ) : null}
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
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
              <span className="text-zinc-600">script</span>
              <span className="mx-1.5 text-zinc-700">{become ? "#" : "$"}</span>
              <span className="text-zinc-400">
                {scriptLoading ? "…" : (script?.name ?? "—")}
              </span>
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <RunHostConsole
              phase={phase}
              events={events}
              idlePrompt={t("run.idle_prompt")}
            />
          </div>

          {/* Result / error banners */}
          <RunStreamStatus
            phase={phase}
            errorMessage={errorMessage}
            onStopWatching={stopWatching}
            variant="terminal"
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
        <div className="flex max-h-[46dvh] min-h-0 shrink-0 flex-col gap-5 overflow-y-auto border-t p-3 pb-0 sm:p-4 sm:pb-0 lg:max-h-none lg:w-72 lg:border-t-0 lg:border-l lg:pb-4">
          {/* Inventory */}
          <div className="space-y-3">
            <p className="text-muted-foreground type-label">
              {t("run.panel.inventory")}
            </p>

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
                groups: t("run.panel.groups"),
                devices: t("run.panel.devices"),
                searchPlaceholder: t("run.panel.search_placeholder"),
                noResults: t("run.panel.no_results"),
                emptyInventory: t("run.panel.empty_inventory"),
                noMatch: t("run.panel.no_match"),
              }}
              searchable
              collapsible
              disabled={isRunning}
            />
          </div>

          {/* Options */}
          <div className="space-y-3 border-t pt-3">
            <p className="text-muted-foreground type-label">
              {t("run.panel.options")}
            </p>

            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="script-become" className="text-xs">
                {t("run.panel.become")}
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
                {t("run.panel.forks")}
              </Label>
              <Input
                id="script-forks"
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
                className="h-10 w-20 text-xs lg:h-7"
              />
            </div>
          </div>

          {/* Run button */}
          <div className="sticky bottom-0 mt-auto border-t bg-background/95 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button className="w-full" onClick={handleRun} disabled={!canRun}>
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

export function RunScriptPage({ id }: { id?: string }) {
  const { t } = useTranslation("scripts")
  if (!id) {
    return (
      <AppProviders>
        <main className="flex flex-1 items-center justify-center p-6">
          <p className="text-muted-foreground text-sm">
            {t("run.script_not_found")}
          </p>
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
