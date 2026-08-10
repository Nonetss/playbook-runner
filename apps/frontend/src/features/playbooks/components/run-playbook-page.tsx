import { getIcon } from "@/lib/icon-registry"

const AlertTriangle = getIcon("status", "alert")
const ArrowLeft = getIcon("navigation", "back")
const BookText = getIcon("resources", "book")
const CheckCircle2 = getIcon("status", "success")
const Loader2 = getIcon("status", "loading")
const Pencil = getIcon("actions", "edit")
const Play = getIcon("actions", "play")
const Plus = getIcon("actions", "add")
const Trash2 = getIcon("actions", "delete")

import { useState } from "react"
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
import { InventorySelectionList } from "@/features/run/components/inventory-selection-list"
import { PlaybookRunConsole } from "@/features/run/components/playbook-run-console"
import { RunStreamStatus } from "@/features/run/components/run-stream-status"
import { useRunInventorySelection } from "@/features/run/hooks/useRunInventorySelection"
import { useRunPlaybook } from "@/features/run/hooks/useRunPlaybook"
import type { RunSelection } from "@/features/run/types"
import { useConfirm } from "@/hooks/useConfirm"
import { cn } from "@/lib/utils"

// ── RunPlaybookPageInner ──────────────────────────────────────────────────────

function RunPlaybookPageInner({ id }: { id: string }) {
  const { t } = useTranslation("playbooks")
  const { data: playbook } = usePlaybookGet(id)
  const { data: groups = [], isPending: groupsLoading } = useGroupsList()
  const { data: devices = [], isPending: devicesLoading } = useDevicesList()
  const { phase, events, result, errorMessage, start, stopWatching, reset } =
    useRunPlaybook()
  const confirm = useConfirm()

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
  const [forks, setForks] = useState(1)
  const [extravars, setExtravars] = useState<{ key: string; value: string }[]>(
    []
  )

  const selectionCount = selectedGroups.size + selectedDevices.size
  const isRunning = phase === "running"

  async function handleRun() {
    if (!playbook || selectionCount === 0) return
    const inventory: RunSelection[] = [
      ...[...selectedGroups].map((id) => ({ id, type: "group" as const })),
      ...[...selectedDevices].map((id) => ({ id, type: "device" as const })),
    ]
    const extravarMap = Object.fromEntries(
      extravars.filter((e) => e.key.trim()).map((e) => [e.key.trim(), e.value])
    )

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
      title: t("run.confirm_title", { name: playbook.name }),
      description: t("run.confirm_description", {
        targets: targetSummary,
        count: selectionCount,
        forks,
        variables: Object.keys(extravarMap).length,
      }),
      confirmLabel: t("run.confirm_run"),
      cancelLabel: t("run.cancel"),
    })
    if (!confirmed) return

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
            <span className="ml-2 truncate font-mono type-console-meta text-zinc-500">
              <span className="text-zinc-600">playbook</span>
              <span className="mx-1.5 text-zinc-700">$</span>
              <span className="text-zinc-400">{playbook?.name ?? "—"}</span>
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <PlaybookRunConsole
              events={events}
              running={isRunning}
              idlePrompt={t("run.idle_prompt")}
            />
          </div>

          {/* Result / error banners */}
          <RunStreamStatus
            phase={phase}
            errorMessage={errorMessage}
            onStopWatching={stopWatching}
            labels={{
              connecting: t("run.connecting"),
              stopWatching: t("run.stop_watching"),
              stoppedWatching: t("run.stopped_watching"),
              serverMayStillBeRunning: t("run.server_may_still_be_running"),
              connectionError: t("run.connection_error"),
            }}
          />

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
        <div className="flex max-h-[46dvh] min-h-0 shrink-0 flex-col gap-4 overflow-y-auto border-t p-3 pb-0 sm:gap-5 sm:p-4 sm:pb-0 lg:max-h-none lg:w-72 lg:border-t-0 lg:border-l lg:pb-4">
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
            />
          </div>

          {/* Options */}
          <div className="space-y-3 border-t pt-3">
            <p className="text-muted-foreground type-label">
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
          <div className="sticky bottom-0 mt-auto border-t bg-background/95 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
