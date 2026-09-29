import { getIcon } from "@/lib/icon-registry"

const Pencil = getIcon("actions", "edit")
const Plus = getIcon("actions", "add")
const Trash2 = getIcon("actions", "delete")

import type * as React from "react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { StateCard } from "@/components/shared/feedback/state-card"
import { DetailFrame } from "@/components/shared/layout/detail-frame"
import { PageHero } from "@/components/shared/layout/page-hero"
import { AppLink } from "@/components/ui/app-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDevicesList } from "@/features/inventory/hooks/use-devices"
import { useGroupsList } from "@/features/inventory/hooks/use-groups"
import { PlaybookSwitcher } from "@/features/playbooks/components/playbook-switcher"
import { usePlaybookGet } from "@/features/playbooks/hooks/use-playbooks"
import { InventorySelectionList } from "@/features/run/components/inventory-selection-list"
import { PlaybookRunConsole } from "@/features/run/components/playbook-run-console"
import { RunButton } from "@/features/run/components/run-button"
import { RunForksOption } from "@/features/run/components/run-options"
import { RunResultBanner } from "@/features/run/components/run-result-banner"
import { RunStreamStatus } from "@/features/run/components/run-stream-status"
import {
  TerminalFrame,
  TerminalPanelSection,
} from "@/features/run/components/terminal-frame"
import { useRunInventorySelection } from "@/features/run/hooks/use-run-inventory-selection"
import { useRunPlaybook } from "@/features/run/hooks/use-run-playbook"
import { toggleIn } from "@/features/run/hooks/use-selection-toggle"
import type { RunSelection } from "@/features/run/types"
import { useConfirm } from "@/hooks/use-confirm"

// ── RunPlaybookPageInner ──────────────────────────────────────────────────────

function RunPlaybookPageInner({ id }: { id: string }) {
  const { t } = useTranslation("playbooks")
  const { data: playbook, isPending: playbookLoading } = usePlaybookGet(id)
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

  const frame = (children: React.ReactNode) => (
    <DetailFrame
      backHref="/playbooks"
      backLabel={t("form.back_to_playbooks")}
      maxWidth="full"
    >
      {children}
    </DetailFrame>
  )

  if (playbookLoading)
    return frame(<StateCard spinner title={t("form.loading")} />)
  if (!playbook) {
    return frame(
      <StateCard tone="destructive" title={t("run.playbook_not_found")} />
    )
  }

  return frame(
    <>
      <PageHero
        surface="playbooks"
        title={playbook.name}
        description={t("run.header_subtitle")}
        meta={<PlaybookSwitcher currentId={id} disabled={isRunning} />}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <AppLink
                href={`/playbooks/${id}/edit`}
                aria-label={t("run.edit_aria")}
              >
                <Pencil className="size-4" />
                {t("run.edit")}
              </AppLink>
            </Button>
            {phase !== "idle" ? (
              <Button variant="outline" onClick={reset} disabled={isRunning}>
                {t("run.new_run")}
              </Button>
            ) : null}
          </div>
        }
      />

      <TerminalFrame
        setupFirst
        active={phase !== "idle"}
        context="playbook"
        command={playbook.name}
        banners={
          <>
            <RunStreamStatus
              phase={phase}
              errorMessage={errorMessage}
              onStopWatching={stopWatching}
              variant="terminal"
              labels={{
                connecting: t("run.connecting"),
                stopWatching: t("run.stop_watching"),
                stoppedWatching: t("run.stopped_watching"),
                serverMayStillBeRunning: t("run.server_may_still_be_running"),
                connectionError: t("run.connection_error"),
              }}
            />
            {phase === "done" && result ? (
              <RunResultBanner
                result={result}
                message={t("run.result_finished_with_status", {
                  status: result.status,
                  rc: result.rc ?? "?",
                })}
              />
            ) : null}
          </>
        }
        panel={
          <>
            <TerminalPanelSection label={t("run.panel.inventory")}>
              <InventorySelectionList
                groups={groups}
                devices={devices}
                selectedGroups={selectedGroups}
                selectedDevices={selectedDevices}
                onToggleGroup={toggleIn(setSelectedGroups)}
                onToggleDevice={toggleIn(setSelectedDevices)}
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
            </TerminalPanelSection>

            <TerminalPanelSection
              label={t("run.panel.options")}
              className="border-t pt-5"
            >
              <RunForksOption
                id="run-forks"
                label={t("run.panel.forks")}
                value={forks}
                onChange={setForks}
                disabled={isRunning}
              />

              <div className="space-y-2">
                <p className="text-sm">{t("run.panel.extravars")}</p>
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
                      className="h-9 min-w-0 flex-1 font-mono text-xs"
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
                      className="h-9 min-w-0 flex-1 font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground"
                      aria-label={t("run.panel.extravars_remove_aria")}
                      onClick={() =>
                        setExtravars((prev) => prev.filter((_, j) => j !== i))
                      }
                    >
                      <Trash2 className="size-3.5" />
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
                  <Plus className="size-3.5" />
                  {t("run.panel.extravars_add")}
                </Button>
              </div>
            </TerminalPanelSection>
          </>
        }
        panelFooter={
          <RunButton
            running={isRunning}
            disabled={isRunning || selectionCount === 0}
            selectionCount={selectionCount}
            label={t("run.run_button")}
            runningLabel={t("run.running")}
            onClick={handleRun}
          />
        }
      >
        <PlaybookRunConsole
          events={events}
          running={isRunning}
          idlePrompt={t("run.idle_prompt")}
        />
      </TerminalFrame>
    </>
  )
}

export function RunPlaybookPage({ id }: { id?: string }) {
  const { t } = useTranslation("playbooks")
  if (!id) {
    return (
      <AppProviders>
        <StateCard tone="destructive" title={t("run.playbook_not_found")} />
      </AppProviders>
    )
  }
  return (
    <AppProviders>
      <RunPlaybookPageInner id={id} />
    </AppProviders>
  )
}
