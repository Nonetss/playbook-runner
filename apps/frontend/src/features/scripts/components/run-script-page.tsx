// Live console + run page for the Scripts feature, composed from the shared
// run pieces in `features/run` (TerminalFrame, panel sections, options).

import type * as React from "react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { StateCard } from "@/components/shared/feedback/state-card"
import { DetailFrame } from "@/components/shared/layout/detail-frame"
import { PageHero } from "@/components/shared/layout/page-hero"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useDevicesList } from "@/features/inventory/hooks/use-devices"
import { useGroupsList } from "@/features/inventory/hooks/use-groups"
import { InventorySelectionList } from "@/features/run/components/inventory-selection-list"
import { RunButton } from "@/features/run/components/run-button"
import { RunHostConsole } from "@/features/run/components/run-host-console"
import {
  RunForksOption,
  RunSwitchOption,
} from "@/features/run/components/run-options"
import { RunResultBanner } from "@/features/run/components/run-result-banner"
import { RunStreamStatus } from "@/features/run/components/run-stream-status"
import {
  TerminalFrame,
  TerminalPanelSection,
} from "@/features/run/components/terminal-frame"
import {
  type ScriptRequest,
  useRunScript,
} from "@/features/run/hooks/use-run-script"
import { toggleIn } from "@/features/run/hooks/use-selection-toggle"
import type { RunSelection } from "@/features/run/types"
import { useScriptGet } from "@/features/scripts/hooks/use-scripts"
import { useConfirm } from "@/hooks/use-confirm"

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

  const frame = (children: React.ReactNode) => (
    <DetailFrame
      backHref="/scripts"
      backLabel={t("form.back_to_scripts")}
      maxWidth="full"
    >
      {children}
    </DetailFrame>
  )

  if (scriptLoading)
    return frame(<StateCard spinner title={t("run.loading")} />)
  if (!script) {
    return frame(
      <StateCard tone="destructive" title={t("run.script_not_found")} />
    )
  }

  return frame(
    <>
      <PageHero
        surface="scripts"
        title={script.name}
        description={t("run.header_subtitle")}
        meta={
          <Badge variant="outline" className="font-mono">
            {script.language ?? t("card.default_language")}
          </Badge>
        }
        action={
          phase !== "idle" ? (
            <Button variant="outline" onClick={reset} disabled={isRunning}>
              {t("run.new_run")}
            </Button>
          ) : undefined
        }
      />

      <TerminalFrame
        setupFirst
        active={phase !== "idle"}
        context="script"
        privileged={become}
        command={script.name}
        banners={
          <>
            <RunStreamStatus
              phase={phase}
              errorMessage={errorMessage}
              onStopWatching={stopWatching}
              variant="terminal"
              labels={{
                connecting: t("run.run_status.connecting"),
                stopWatching: t("run.run_status.stop_watching"),
                stoppedWatching: t("run.run_status.stopped_watching"),
                serverMayStillBeRunning: t(
                  "run.run_status.server_may_still_be_running"
                ),
                connectionError: t("run.run_status.connection_error"),
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
              <RunSwitchOption
                id="script-become"
                label={t("run.panel.become")}
                checked={become}
                onCheckedChange={setBecome}
                disabled={isRunning}
              />
              <RunForksOption
                id="script-forks"
                label={t("run.panel.forks")}
                value={forks}
                onChange={setForks}
                disabled={isRunning}
              />
            </TerminalPanelSection>
          </>
        }
        panelFooter={
          <RunButton
            running={isRunning}
            disabled={!canRun}
            selectionCount={selectionCount}
            label={t("run.run_button")}
            runningLabel={t("run.running")}
            onClick={handleRun}
          />
        }
      >
        <RunHostConsole
          phase={phase}
          events={events}
          idlePrompt={t("run.idle_prompt")}
        />
      </TerminalFrame>
    </>
  )
}

export function RunScriptPage({ id }: { id?: string }) {
  const { t } = useTranslation("scripts")
  if (!id) {
    return (
      <AppProviders>
        <StateCard tone="destructive" title={t("run.script_not_found")} />
      </AppProviders>
    )
  }
  return (
    <AppProviders>
      <RunScriptPageInner id={id} />
    </AppProviders>
  )
}
